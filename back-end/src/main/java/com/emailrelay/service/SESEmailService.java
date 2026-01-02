package com.emailrelay.service;

import com.emailrelay.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SESEmailService {

    private final SesClient sesClient;

    @Value("${aws.ses.from-email}")
    private String fromEmail;

    /**
     * Send email via AWS SES
     */
    public void sendEmail(String to, String subject, String body) {
        sendEmail(List.of(to), subject, body);
    }

    /**
     * Send email to multiple recipients via AWS SES
     */
    public void sendEmail(List<String> toAddresses, String subject, String body) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder()
                            .toAddresses(toAddresses)
                            .build())
                    .message(Message.builder()
                            .subject(Content.builder()
                                    .charset("UTF-8")
                                    .data(subject)
                                    .build())
                            .body(Body.builder()
                                    .text(Content.builder()
                                            .charset("UTF-8")
                                            .data(body)
                                            .build())
                                    .build())
                            .build())
                    .build();

            SendEmailResponse response = sesClient.sendEmail(request);

            log.info("Email sent via SES. MessageId: {}", response.messageId());

        } catch (SesException e) {
            log.error("Failed to send email via SES", e);
            throw new CustomException.EmailSendException("SES error: " + e.awsErrorDetails().errorMessage());
        } catch (Exception e) {
            log.error("Failed to send email via SES", e);
            throw new CustomException.EmailSendException(e.getMessage());
        }
    }

    /**
     * Send HTML email via AWS SES
     */
    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        sendHtmlEmail(List.of(to), subject, htmlBody);
    }

    /**
     * Send HTML email to multiple recipients via AWS SES
     */
    public void sendHtmlEmail(List<String> toAddresses, String subject, String htmlBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder()
                            .toAddresses(toAddresses)
                            .build())
                    .message(Message.builder()
                            .subject(Content.builder()
                                    .charset("UTF-8")
                                    .data(subject)
                                    .build())
                            .body(Body.builder()
                                    .html(Content.builder()
                                            .charset("UTF-8")
                                            .data(htmlBody)
                                            .build())
                                    .build())
                            .build())
                    .build();

            SendEmailResponse response = sesClient.sendEmail(request);

            log.info("HTML email sent via SES. MessageId: {}", response.messageId());

        } catch (SesException e) {
            log.error("Failed to send HTML email via SES", e);
            throw new CustomException.EmailSendException("SES error: " + e.awsErrorDetails().errorMessage());
        } catch (Exception e) {
            log.error("Failed to send HTML email via SES", e);
            throw new CustomException.EmailSendException(e.getMessage());
        }
    }

    /**
     * Send email with both text and HTML body
     */
    public void sendMixedEmail(List<String> toAddresses, String subject, String textBody, String htmlBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder()
                            .toAddresses(toAddresses)
                            .build())
                    .message(Message.builder()
                            .subject(Content.builder()
                                    .charset("UTF-8")
                                    .data(subject)
                                    .build())
                            .body(Body.builder()
                                    .text(Content.builder()
                                            .charset("UTF-8")
                                            .data(textBody)
                                            .build())
                                    .html(Content.builder()
                                            .charset("UTF-8")
                                            .data(htmlBody)
                                            .build())
                                    .build())
                            .build())
                    .build();

            SendEmailResponse response = sesClient.sendEmail(request);

            log.info("Mixed email sent via SES. MessageId: {}", response.messageId());

        } catch (SesException e) {
            log.error("Failed to send mixed email via SES", e);
            throw new CustomException.EmailSendException("SES error: " + e.awsErrorDetails().errorMessage());
        } catch (Exception e) {
            log.error("Failed to send mixed email via SES", e);
            throw new CustomException.EmailSendException(e.getMessage());
        }
    }
}
