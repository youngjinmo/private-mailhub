package com.emailrelay.controller;

import com.emailrelay.dto.ParsedEmail;
import com.emailrelay.dto.S3EventNotification;
import com.emailrelay.exception.CustomException;
import com.emailrelay.service.CacheService;
import com.emailrelay.service.S3EmailService;
import com.emailrelay.service.SESEmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookController {

    private final S3EmailService s3EmailService;
    private final SESEmailService sesEmailService;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;
    @Value("${spring.application.name}")
    private String serviceName;

    /**
     * Listen to SQS queue for incoming email notifications
     */
    @SqsListener("${aws.sqs.email-queue-name}")
    public void handleEmailFromSqs(String message) {
        try {
            log.info("Received SQS message: {}", message);

            // Parse S3 event notification from SQS message
            S3EventNotification s3Event = objectMapper.readValue(message, S3EventNotification.class);

            if (s3Event.getRecords() == null || s3Event.getRecords().isEmpty()) {
                log.warn("No records found in SQS message");
                return;
            }

            // Process each record
            for (S3EventNotification.Record record : s3Event.getRecords()) {
                processEmailRecord(record);
            }

        } catch (Exception e) {
            log.error("Failed to process SQS message", e);
            throw new CustomException.UnknownServerError("Failed to process SQS message: " + e.getMessage());
        }
    }

    /**
     * Process individual email record from S3 event
     */
    private void processEmailRecord(S3EventNotification.Record record) {
        try {
            // Extract S3 bucket name and object key
            String bucketName = record.getS3().getBucket().getName();
            String objectKey = record.getS3().getObject().getKey();

            log.info("Processing email from S3 - Bucket: {}, Key: {}", bucketName, objectKey);

            // 1. Fetch and parse email from S3
            ParsedEmail parsedEmail = s3EmailService.fetchAndParseEmail(objectKey);

            // Extract relay email from SES record
            String relayEmail = extractRelayEmail(record);
            parsedEmail.setOriginalRecipient(relayEmail);

            // 2. Get primary email from relay email mapping (from cache)
            String primaryEmail = getPrimaryEmailFromRelayEmail(relayEmail);

            // 3. Process email content (add forwarding info and AI summary)
            String processedSubject = buildForwardedSubject(parsedEmail.getSubject());

            // TODO: Implement AI summarization logic
            // String summary = aiService.summarizeEmailContent(parsedEmail.getTextBody());
            String summary = "TODO: AI 요약 로직 구현 필요";

            String processedBody = buildForwardedBodyWithSummary(parsedEmail, summary);

            // 4. Forward email via SES
            if (parsedEmail.getHtmlBody() != null) {
                String processedHtmlBody = buildForwardedHtmlBodyWithSummary(parsedEmail, summary);
                sesEmailService.sendMixedEmail(
                        List.of(primaryEmail),
                        processedSubject,
                        processedBody,
                        processedHtmlBody
                );
            } else {
                sesEmailService.sendEmail(
                        List.of(primaryEmail),
                        processedSubject,
                        processedBody
                );
            }

            log.info("Email forwarded successfully from {} to {}", relayEmail, primaryEmail);

        } catch (Exception e) {
            log.error("Failed to process email record", e);
            throw new CustomException.UnknownServerError("Email forwarding failed: " + e.getMessage());
        }
    }

    /**
     * Extract relay email from SES record
     */
    private String extractRelayEmail(S3EventNotification.Record record) {
        if (record.getSes() == null ||
            record.getSes().getMail() == null ||
            record.getSes().getMail().getDestination() == null ||
            record.getSes().getMail().getDestination().isEmpty()) {
            throw new CustomException.UnknownServerError("No destination email found in SES record");
        }

        return record.getSes().getMail().getDestination().get(0);
    }

    /**
     * Get primary email from relay email (via cache)
     */
    private String getPrimaryEmailFromRelayEmail(String relayEmail) {
        try {
            String primaryEmail = cacheService.getPrimaryEmailByRelayEmail(relayEmail);
            if (primaryEmail == null) {
                throw new CustomException.NotFoundRelayEmailException(relayEmail);
            }
            return primaryEmail;
        } catch (Exception e) {
            log.error("Failed to get primary email for relay: {}", relayEmail, e);
            throw new CustomException.NotFoundRelayEmailException(relayEmail);
        }
    }

    /**
     * Build forwarded subject with prefix
     */
    private String buildForwardedSubject(String originalSubject) {
        return "[" + serviceName + "] " + (originalSubject != null ? originalSubject : "(No Subject)");
    }

    /**
     * Build forwarded text body with metadata and AI summary
     */
    private String buildForwardedBodyWithSummary(ParsedEmail email, String summary) {
        StringBuilder body = new StringBuilder();

        // AI Summary section
        body.append("========== AI 요약 ==========\n");
        body.append(summary).append("\n");
        body.append("================================\n\n");

        // Original email metadata
        body.append("---------- Forwarded Message ----------\n");
        body.append("From: ").append(email.getFrom()).append("\n");
        body.append("To: ").append(email.getOriginalRecipient()).append("\n");
        if (email.getCc() != null && !email.getCc().isEmpty()) {
            body.append("CC: ").append(String.join(", ", email.getCc())).append("\n");
        }
        body.append("Subject: ").append(email.getSubject() != null ? email.getSubject() : "(No Subject)").append("\n");
        body.append("---------------------------------------\n\n");
        body.append(email.getTextBody() != null ? email.getTextBody() : "");

        return body.toString();
    }

    /**
     * Build forwarded HTML body with metadata and AI summary
     */
    private String buildForwardedHtmlBodyWithSummary(ParsedEmail email, String summary) {
        StringBuilder html = new StringBuilder();

        // AI Summary section
        html.append("<div style='border: 2px solid #4CAF50; padding: 15px; margin: 10px 0; background-color: #f0f8f0; border-radius: 5px;'>");
        html.append("<h2 style='color: #4CAF50; margin-top: 0;'>📝 AI 요약</h2>");
        html.append("<p style='white-space: pre-wrap;'>").append(summary).append("</p>");
        html.append("</div>");

        // Original email metadata
        html.append("<div style='border: 1px solid #ccc; padding: 10px; margin: 10px 0; background-color: #f9f9f9;'>");
        html.append("<h3>Forwarded Message</h3>");
        html.append("<p><strong>From:</strong> ").append(email.getFrom()).append("</p>");
        html.append("<p><strong>To:</strong> ").append(email.getOriginalRecipient()).append("</p>");
        if (email.getCc() != null && !email.getCc().isEmpty()) {
            html.append("<p><strong>CC:</strong> ").append(String.join(", ", email.getCc())).append("</p>");
        }
        html.append("<p><strong>Subject:</strong> ").append(email.getSubject() != null ? email.getSubject() : "(No Subject)").append("</p>");
        html.append("</div>");

        // Original email body
        html.append("<div>");
        html.append(email.getHtmlBody() != null ? email.getHtmlBody() : "");
        html.append("</div>");

        return html.toString();
    }
}
