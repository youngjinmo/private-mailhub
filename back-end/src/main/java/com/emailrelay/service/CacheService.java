package com.emailrelay.service;

import com.emailrelay.repository.CacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final CacheRepository cacheRepository;

    private static final String SESSION_PREFIX = "session:";
    private static final String RELAY_EMAIL_PREFIX = "relay-email:";

    private static final long DEFAULT_SESSION_TIMEOUT = 3600L; // 1 hour in seconds

    /**
     * Store user session
     */
    public void storeSession(UUID userId, String token) {
        String key = setSessionKey(userId);
        cacheRepository.set(key, token, DEFAULT_SESSION_TIMEOUT, TimeUnit.SECONDS);
        log.debug("Stored session for user: {}", userId);
    }

    /**
     * Get user session token
     */
    public String getSession(UUID userId) {
        String key = setSessionKey(userId);
        Object value = cacheRepository.get(key);
        return value != null ? value.toString() : null;
    }

    /**
     * Remove user session
     */
    public void removeSession(UUID userId) {
        String key = setSessionKey(userId);
        cacheRepository.delete(key);
        log.debug("Removed session for user: {}", userId);
    }

    /**
     * Check if session exists
     */
    public boolean hasSession(UUID userId) {
        String key = setSessionKey(userId);
        return cacheRepository.hasKey(key);
    }

    private String setSessionKey(UUID userId) {
        return SESSION_PREFIX + userId.toString();
    }

    /**
     * Set relay email
     * @param primaryEmail
     * @param relayEmail
     */
    public void setRelayEmail(String primaryEmail, String relayEmail) {
        String key = setRelayEmailCacheKey(relayEmail);
        cacheRepository.set(key, primaryEmail);
        log.info("Relay email has been set for user: {}", relayEmail);
    }

    /**
     * Get primary email by relay email
     * @param relayEmail
     * @return
     */
    public String getPrimaryEmailByRelayEmail(String relayEmail) {
        String key = setRelayEmailCacheKey(relayEmail);
        return cacheRepository.get(key).toString();
    }

    private String setRelayEmailCacheKey(String relayEmail) {
        return RELAY_EMAIL_PREFIX + relayEmail;
    }

    /**
     * Store cache value with expiration
     */
    public void set(String key, Object value, long timeout, TimeUnit unit) {
        cacheRepository.set(key, value, timeout, unit);
        log.debug("Cached value for key: {}", key);
    }

    /**
     * Store cache value without expiration
     */
    public void set(String key, Object value) {
        cacheRepository.set(key, value);
        log.debug("Cached value for key: {}", key);
    }

    /**
     * Get cache value
     */
    public Object get(String key) {
        return cacheRepository.get(key);
    }

    /**
     * Remove cache value
     */
    public void remove(String key) {
        cacheRepository.delete(key);
        log.debug("Removed cache for key: {}", key);
    }

    /**
     * Check if cache key exists
     */
    public boolean exists(String key) {
        return cacheRepository.hasKey(key);
    }

    /**
     * Set expiration time for existing key
     */
    public boolean expire(String key, long timeout, TimeUnit unit) {
        return cacheRepository.expire(key, timeout, unit);
    }

    /**
     * Clear all sessions (use with caution)
     */
    public void clearAllSessions() {
        cacheRepository.keys(SESSION_PREFIX + "*").forEach(cacheRepository::delete);
        log.warn("Cleared all sessions");
    }

    // Raw methods without prefix (for internal services like VerificationService)

    /**
     * Set value with custom key (no prefix added)
     */
    public void setRaw(String key, Object value, long timeout, TimeUnit unit) {
        cacheRepository.set(key, value, timeout, unit);
    }

    /**
     * Get value with custom key (no prefix added)
     */
    public Object getRaw(String key) {
        return cacheRepository.get(key);
    }

    /**
     * Delete with custom key (no prefix added)
     */
    public void deleteRaw(String key) {
        cacheRepository.delete(key);
    }

    /**
     * Increment with custom key (no prefix added)
     */
    public Long incrementRaw(String key) {
        return cacheRepository.increment(key);
    }
}
