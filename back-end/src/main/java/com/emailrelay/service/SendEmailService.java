package com.emailrelay.service;

import com.emailrelay.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.application.name}")
    private final String serviceName;

    public void sendVerificationCode(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("[" + serviceName + "] Verification Code");
            message.setText(buildVerificationEmailBody(code));

            mailSender.send(message);
            log.info("Verification email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", to, e);
            throw new CustomException.EmailSendException(e.getMessage());
        }
    }

    /**
     * Send email with custom title and content
     */
    public void sendEmail(String to, String title, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(title);
            message.setText(content);

            mailSender.send(message);
            log.info("Email sent to: {} with title: {}", to, title);
        } catch (Exception e) {
            log.error("Failed to send email to: {}", to, e);
            throw new CustomException.EmailSendException(e.getMessage());
        }
    }

    /**
     * Send email with service name prefix in title
     */
    public void sendEmailWithPrefix(String to, String title, String content) {
        String prefixedTitle = "[" + serviceName + "] " + title;
        sendEmail(to, prefixedTitle, content);
    }

    private String buildVerificationEmailBody(String code) {
        return String.format("""
                Email Relay Verification Code

                %s

                This code will expire in 5 minutes.

                If you didn't request this code, please ignore this email.

                """, code);
    }
}
