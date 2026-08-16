-- ==========================================================
-- Biometric Contact Recognition System - Seed Data
-- ==========================================================

USE `contact_fingerprint_db`;

-- 1. SEED DEFAULT ADMIN USER (Password: admin123)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`) VALUES
(1, 'System Administrator', 'admin@biocontact.local', '$2a$10$6non.YG4jGIXmkyH5OKv0e5zOWRHFiXh3.OS2Jxxs2/yQ6RhuBRU.', 'ADMIN'),
(2, 'Lab Operator', 'operator@biocontact.local', '$2a$10$6non.YG4jGIXmkyH5OKv0e5zOWRHFiXh3.OS2Jxxs2/yQ6RhuBRU.', 'USER')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. SEED SAMPLE HARDWARE DEVICES
INSERT INTO `devices` (`id`, `device_id`, `name`, `sensor_type`, `status`, `ip_address`, `template_count`, `firmware_version`, `last_seen`) VALUES
(1, 'ESP32-BIO-01', 'Main Lab Biometric Scanner', 'AS608', 'ONLINE', '192.168.1.105', 5, '1.2.0', NOW()),
(2, 'ESP32-BIO-02', 'Reception Kiosk Terminal', 'R307', 'ONLINE', '192.168.1.106', 3, '1.2.0', NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 3. SEED INITIAL CONTACTS
INSERT INTO `contacts` (`id`, `name`, `phone`, `email`, `relationship`, `company_or_organization`, `address`, `notes`, `profile_image`) VALUES
(1, 'Rahul Kumar', '+91 9876543210', 'rahul.kumar@college.edu', 'Project Guide', 'Department of CSE, Engineering College', 'Block 4, Room 302, College Campus', 'Chief Guide for IoT and Biometric Research projects.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'),
(2, 'Dr. Priya Sharma', '+91 9812345678', 'priya.sharma@college.edu', 'Head of Department', 'Computer Science & Engineering', 'Faculty Wing, Room 101', 'Coordinates department research grants and lab equipment approvals.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'),
(3, 'Vikram Patel', '+91 9723456789', 'vikram.patel@hardwarehub.in', 'Hardware Vendor', 'Embedded Systems Solutions', '12 Electronics Arcade, Bangalore', 'Supplier of AS608 and R307 optical fingerprint modules.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'),
(4, 'Ananya Sen', '+91 9654321870', 'ananya.sen@iotlab.org', 'Lab Assistant', 'Embedded Systems & Robotics Lab', 'Lab 204, Tech Park', 'In charge of ESP32 breadboards and multimeter diagnostics.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80'),
(5, 'Suresh Reddy', '+91 9543218760', 'suresh.reddy@securitynet.com', 'Security Consultant', 'CyberSec Protocols Ltd', 'Tower B, Cyber Gateway, Hyderabad', 'Advises on biometric template encryption and sensor protocol hardening.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 4. SEED FINGERPRINT MAPPINGS (Sensor Slot IDs mapped to Contacts)
INSERT INTO `fingerprints` (`id`, `contact_id`, `fingerprint_id`, `sensor_type`, `sensor_identifier`, `status`) VALUES
(1, 1, 27, 'AS608', 'ESP32-BIO-01', 'ACTIVE'),
(2, 2, 12, 'AS608', 'ESP32-BIO-01', 'ACTIVE'),
(3, 3, 5, 'AS608', 'ESP32-BIO-01', 'ACTIVE'),
(4, 4, 18, 'AS608', 'ESP32-BIO-01', 'ACTIVE'),
(5, 5, 9, 'AS608', 'ESP32-BIO-01', 'ACTIVE')
ON DUPLICATE KEY UPDATE `fingerprint_id`=VALUES(`fingerprint_id`);

-- 5. SEED SAMPLE RECOGNITION AUDIT LOGS
INSERT INTO `recognition_logs` (`id`, `fingerprint_id`, `contact_id`, `sensor_identifier`, `status`, `recognized_at`, `device_id`, `metadata`) VALUES
(1, 27, 1, 'ESP32-BIO-01', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 15 MINUTE), 'ESP32-BIO-01', '{"confidence": 98, "match_time_ms": 420}'),
(2, 12, 2, 'ESP32-BIO-01', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 45 MINUTE), 'ESP32-BIO-01', '{"confidence": 95, "match_time_ms": 380}'),
(3, NULL, NULL, 'ESP32-BIO-01', 'UNKNOWN', DATE_SUB(NOW(), INTERVAL 1 HOUR), 'ESP32-BIO-01', '{"reason": "Template not found in sensor database"}'),
(4, 5, 3, 'ESP32-BIO-01', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 3 HOUR), 'ESP32-BIO-01', '{"confidence": 92, "match_time_ms": 460}'),
(5, 18, 4, 'ESP32-BIO-01', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 5 HOUR), 'ESP32-BIO-01', '{"confidence": 99, "match_time_ms": 310}')
ON DUPLICATE KEY UPDATE `status`=VALUES(`status`);
