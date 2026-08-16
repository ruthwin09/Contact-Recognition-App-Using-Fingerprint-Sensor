# MySQL Database Architecture & Setup

## Overview
The **Contact Recognition System** utilizes a normalized relational MySQL database designed to maintain strict integrity between biometric sensor IDs and contact profiles while honoring biometric privacy by **never storing raw biometric image files**.

## Tables

| Table | Purpose |
|---|---|
| `users` | System administrators and operators with bcrypt-hashed credentials |
| `contacts` | Profiles containing name, phone, email, notes, organization, and profile image |
| `fingerprints` | Biometric slot ID mappings (e.g. sensor slot #27 -> Contact #1) |
| `devices` | ESP32 hardware units, connection statuses, sensor types, and IP addresses |
| `recognition_logs` | Audit trail of all live biometric scan attempts (SUCCESS, UNKNOWN, ERROR) |
| `audit_logs` | Administrative changes (contact modifications, template deletions) |

## Database Setup

### 1. Create and Seed Database via MySQL CLI
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p contact_fingerprint_db < database/seed.sql
```

### 2. Configure Environment
Update `server/.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=contact_fingerprint_db
```

### 3. Automatic In-Memory Fallback
If MySQL is not installed or unreachable during testing/demonstrations, the backend automatically transitions to an embedded in-memory database seeded with default mock records.
