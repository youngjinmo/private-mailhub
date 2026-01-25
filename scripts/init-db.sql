-- Database initialization script for Private MailHub
-- This script creates the database and tables for production deployment

CREATE DATABASE IF NOT EXISTS private_mailhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE private_mailhub

-- Users 테이블 생성
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `username_hash` CHAR(64) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'USER',
  `subscription_tier` VARCHAR(50) NOT NULL DEFAULT 'FREE',
  `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  `deactivated_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  `last_logined_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_username_hash` (`username_hash`),
  KEY `idx_username_hash` (`username_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relay Emails 테이블 생성
CREATE TABLE `relay_emails` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `primary_email` VARCHAR(255) NOT NULL,
  `relay_email` VARCHAR(128) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `forward_count` BIGINT NOT NULL DEFAULT 0,
  `last_forwarded_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pausedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_relay_email` (`relay_address`),
  CONSTRAINT `FK_relay_emails_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;