package com.emailrelay.service;

import com.emailrelay.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final CacheService cacheService;
    private final SendEmailService sendEmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${verification.code.expiration}")
    private Long codeExpiration;

    @Value("${verification.code.max-attempts}")
    private Integer maxAttempts;

    private static final String CODE_PREFIX = "verification:code:";
    private static final String ATTEMPT_PREFIX = "verification:attempt:";
    private static final String RATE_LIMIT_PREFIX = "verification:ratelimit:";

    public String sendVerificationCode(String email) {
        String code = generateCode();
        String key = CODE_PREFIX + email + ":";
        String attemptKey = ATTEMPT_PREFIX + email + ":";

        cacheService.setRaw(key, code, codeExpiration, TimeUnit.MILLISECONDS);
        cacheService.setRaw(attemptKey, 0, codeExpiration, TimeUnit.MILLISECONDS);

        sendEmailService.sendVerificationCode(email, code);
        log.info("Verification code sent to {}", email);

        return code;
    }

    public boolean verifyCode(String email, String code) {
        String key = CODE_PREFIX + email + ":";
        String attemptKey = ATTEMPT_PREFIX + email + ":";

        Integer attempts = (Integer) cacheService.getRaw(attemptKey);
        if (attempts != null && attempts >= maxAttempts) {
            log.warn("Max verification attempts exceeded for {}", email);
            throw new CustomException.TooManyAttemptsException();
        }

        String storedCode = (String) cacheService.getRaw(key);
        if (storedCode == null) {
            log.warn("Verification code not found or expired for {}", email);
            throw new CustomException.InvalidVerificationCodeException();
        }

        if (!storedCode.equals(code)) {
            cacheService.incrementRaw(attemptKey);
            log.warn("Invalid verification code for {}", email);
            throw new CustomException.InvalidVerificationCodeException();
        }

        cacheService.deleteRaw(key);
        cacheService.deleteRaw(attemptKey);

        log.info("Verification successful for {}", email);
        return true;
    }

    private String generateCode() {
        return String.format("%06d", secureRandom.nextInt(1000000));
    }
}
