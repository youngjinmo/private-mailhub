-- Database initialization script for Private MailHub
-- This script creates the database and tables for production deployment

CREATE DATABASE IF NOT EXISTS private_mailhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE private_mailhub;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  subscription_tier ENUM('FREE', 'PRO', 'ENTERPRISE') DEFAULT 'FREE' NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  deleted_at DATETIME NULL,
  last_logined_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relay Emails table
CREATE TABLE IF NOT EXISTS relay_emails (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  primary_email VARCHAR(255) NOT NULL,
  relay_address VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) DEFAULT 1 NOT NULL,
  forward_count BIGINT DEFAULT 0 NOT NULL,
  last_forwarded_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  deleted_at DATETIME NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_primary_email (primary_email),
  INDEX idx_relay_address (relay_address),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables
SHOW TABLES;
