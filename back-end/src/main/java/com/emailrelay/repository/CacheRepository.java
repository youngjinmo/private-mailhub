package com.emailrelay.repository;

import java.util.Set;
import java.util.concurrent.TimeUnit;

public interface CacheRepository {

    /**
     * Set a value with expiration
     */
    void set(String key, Object value, long timeout, TimeUnit unit);

    /**
     * Set a value without expiration
     */
    void set(String key, Object value);

    /**
     * Get a value
     */
    Object get(String key);

    /**
     * Delete a key
     */
    void delete(String key);

    /**
     * Check if key exists
     */
    boolean hasKey(String key);

    /**
     * Increment a value
     */
    Long increment(String key);

    /**
     * Set expiration for existing key
     */
    boolean expire(String key, long timeout, TimeUnit unit);

    /**
     * Get keys matching pattern
     */
    Set<String> keys(String pattern);
}
