package com.emailrelay.service;

import com.emailrelay.dto.ParsedEmail;
import com.emailrelay.exception.CustomException;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3EmailService {

    private final S3Client s3Client;

    @Value("${aws.s3.email-bucket}")
    private String emailBucket;

    /**
     * Fetch email from S3 and parse it
     */
    public ParsedEmail fetchAndParseEmail(String s3Key) {
        try {
            // Fetch email from S3
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(emailBucket)
                    .key(s3Key)
                    .build();

            ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest);

            // Parse email using JavaMail
            Session session = Session.getInstance(new Properties());
            MimeMessage message = new MimeMessage(session, s3Object);

            return parseEmail(message);

        } catch (Exception e) {
            log.error("Failed to fetch and parse email from S3: {}", s3Key, e);
            throw new CustomException.UnknownServerError("Failed to fetch email from S3: " + e.getMessage());
        }
    }

    /**
     * Parse MimeMessage to ParsedEmail DTO
     */
    private ParsedEmail parseEmail(MimeMessage message) throws MessagingException, IOException {
        return ParsedEmail.builder()
                .messageId(message.getMessageID())
                .from(extractFrom(message))
                .to(extractRecipients(message, jakarta.mail.Message.RecipientType.TO))
                .cc(extractRecipients(message, jakarta.mail.Message.RecipientType.CC))
                .subject(message.getSubject())
                .textBody(extractTextBody(message))
                .htmlBody(extractHtmlBody(message))
                .build();
    }

    /**
     * Extract sender email address
     */
    private String extractFrom(MimeMessage message) throws MessagingException {
        InternetAddress[] from = (InternetAddress[]) message.getFrom();
        return from != null && from.length > 0 ? from[0].getAddress() : null;
    }

    /**
     * Extract recipient email addresses
     */
    private List<String> extractRecipients(MimeMessage message, jakarta.mail.Message.RecipientType type)
            throws MessagingException {
        InternetAddress[] recipients = (InternetAddress[]) message.getRecipients(type);
        if (recipients == null) {
            return List.of();
        }
        return Arrays.stream(recipients)
                .map(InternetAddress::getAddress)
                .collect(Collectors.toList());
    }

    /**
     * Extract text body from message
     */
    private String extractTextBody(MimeMessage message) {
        try {
            Object content = message.getContent();
            if (content instanceof String) {
                return (String) content;
            } else if (content instanceof jakarta.mail.Multipart) {
                jakarta.mail.Multipart multipart = (jakarta.mail.Multipart) content;
                for (int i = 0; i < multipart.getCount(); i++) {
                    jakarta.mail.BodyPart bodyPart = multipart.getBodyPart(i);
                    if (bodyPart.isMimeType("text/plain")) {
                        return (String) bodyPart.getContent();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract text body", e);
        }
        return null;
    }

    /**
     * Extract HTML body from message
     */
    private String extractHtmlBody(MimeMessage message) {
        try {
            Object content = message.getContent();
            if (content instanceof jakarta.mail.Multipart) {
                jakarta.mail.Multipart multipart = (jakarta.mail.Multipart) content;
                for (int i = 0; i < multipart.getCount(); i++) {
                    jakarta.mail.BodyPart bodyPart = multipart.getBodyPart(i);
                    if (bodyPart.isMimeType("text/html")) {
                        return (String) bodyPart.getContent();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract HTML body", e);
        }
        return null;
    }
}
