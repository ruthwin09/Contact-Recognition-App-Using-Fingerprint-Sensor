-- ==========================================================
-- Biometric Contact Recognition System Database Schema
-- Target: MySQL 8.0+
-- Database: contact_fingerprint_db
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `contact_fingerprint_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `contact_fingerprint_db`;

-- ----------------------------------------------------------
-- 1. USERS TABLE (System administrators and operators)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `recognition_logs`;
DROP TABLE IF EXISTS `fingerprints`;
DROP TABLE IF EXISTS `devices`;
DROP TABLE IF EXISTS `contacts`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. CONTACTS TABLE (People whose profiles are recognized)
-- ----------------------------------------------------------
CREATE TABLE `contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(150) NULL,
  `relationship` VARCHAR(80) NULL,
  `company_or_organization` VARCHAR(120) NULL,
  `address` TEXT NULL,
  `notes` TEXT NULL,
  `profile_image` LONGTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_contacts_name` (`name`),
  INDEX `idx_contacts_phone` (`phone`),
  INDEX `idx_contacts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. FINGERPRINTS TABLE (Biometric slot mappings to contacts)
-- ----------------------------------------------------------
-- Note: Raw biometric images are NOT stored. Only sensor slot IDs.
CREATE TABLE `fingerprints` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `contact_id` INT NOT NULL,
  `fingerprint_id` INT NOT NULL,
  `sensor_type` ENUM('AS608', 'R307', 'MOCK') NOT NULL DEFAULT 'AS608',
  `sensor_identifier` VARCHAR(64) NOT NULL DEFAULT 'ESP32-BIO-01',
  `status` ENUM('ACTIVE', 'REVOKED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_fingerprints_contact` FOREIGN KEY (`contact_id`) 
    REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_sensor_fingerprint` (`sensor_identifier`, `fingerprint_id`),
  INDEX `idx_fingerprints_contact` (`contact_id`),
  INDEX `idx_fingerprints_id` (`fingerprint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. DEVICES TABLE (ESP32 microcontrollers and sensors)
-- ----------------------------------------------------------
CREATE TABLE `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `sensor_type` ENUM('AS608', 'R307', 'MOCK') NOT NULL DEFAULT 'AS608',
  `status` ENUM('ONLINE', 'OFFLINE', 'ERROR') NOT NULL DEFAULT 'OFFLINE',
  `ip_address` VARCHAR(45) NULL,
  `template_count` INT DEFAULT 0,
  `firmware_version` VARCHAR(32) DEFAULT '1.0.0',
  `last_seen` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_devices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. RECOGNITION LOGS TABLE (Audit trail of all biometric scans)
-- ----------------------------------------------------------
CREATE TABLE `recognition_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fingerprint_id` INT NULL,
  `contact_id` INT NULL,
  `sensor_identifier` VARCHAR(64) NOT NULL,
  `status` ENUM('SUCCESS', 'UNKNOWN', 'ERROR') NOT NULL,
  `recognized_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `device_id` VARCHAR(64) NOT NULL,
  `metadata` JSON NULL,
  CONSTRAINT `fk_logs_contact` FOREIGN KEY (`contact_id`) 
    REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  INDEX `idx_logs_recognized_at` (`recognized_at`),
  INDEX `idx_logs_status` (`status`),
  INDEX `idx_logs_contact` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. AUDIT LOGS TABLE (Administrative actions tracking)
-- ----------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
