package com.emailrelay.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class CustomException extends RuntimeException {
    private final HttpStatus status;

    public CustomException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public static class UserAlreadyExistsException extends CustomException {
        public UserAlreadyExistsException(String email) {
            super("User with email " + email + " already exists", HttpStatus.CONFLICT);
        }
    }

    public static class UserNotFoundException extends CustomException {
        public UserNotFoundException(String email) {
            super("User with email " + email + " not found", HttpStatus.NOT_FOUND);
        }
    }

    public static class InvalidVerificationCodeException extends CustomException {
        public InvalidVerificationCodeException() {
            super("Invalid or expired verification code", HttpStatus.BAD_REQUEST);
        }
    }

    public static class TooManyAttemptsException extends CustomException {
        public TooManyAttemptsException() {
            super("Too many verification attempts. Please request a new code", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    public static class RateLimitExceededException extends CustomException {
        public RateLimitExceededException() {
            super("Rate limit exceeded. Please try again later", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    public static class InvalidTokenException extends CustomException {
        public InvalidTokenException() {
            super("Invalid or expired token", HttpStatus.UNAUTHORIZED);
        }
    }

    public static class InvalidAuthMethodException extends CustomException {
        public InvalidAuthMethodException(String message) {
            super(message, HttpStatus.BAD_REQUEST);
        }
    }

    public static class EmailSendException extends CustomException {
        public EmailSendException(String message) {
            super("Failed to send email: " + message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public static class NotFoundRelayEmailException extends CustomException {
        public NotFoundRelayEmailException(String relayEmail) {
            super("Failed to find relay email: " + relayEmail, HttpStatus.BAD_REQUEST);
        }
    }

    public static class GenerateRelayEmailException extends CustomException {
        public GenerateRelayEmailException() {
            super("Failed to generate relay email ", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public static class UnknownServerError extends CustomException {
        public UnknownServerError() {
            super("Unknown server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        public UnknownServerError(String message) {
            super("Unknown server error: " + message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
