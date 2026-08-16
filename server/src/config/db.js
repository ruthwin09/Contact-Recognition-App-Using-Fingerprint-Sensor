const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool = null;
let isMockDb = false;

// In-Memory Database Fallback State (used if MySQL is not reachable or during tests)
const mockDb = {
  users: [
    {
      id: 1,
      name: 'System Administrator',
      email: 'admin@biocontact.local',
      password_hash: '$2a$10$6non.YG4jGIXmkyH5OKv0e5zOWRHFiXh3.OS2Jxxs2/yQ6RhuBRU.', // admin123
      role: 'ADMIN',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Lab Operator',
      email: 'operator@biocontact.local',
      password_hash: '$2a$10$6non.YG4jGIXmkyH5OKv0e5zOWRHFiXh3.OS2Jxxs2/yQ6RhuBRU.',
      role: 'USER',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  contacts: [
    {
      id: 1,
      name: 'Rahul Kumar',
      phone: '+91 9876543210',
      email: 'rahul.kumar@college.edu',
      relationship: 'Project Guide',
      company_or_organization: 'Department of CSE, Engineering College',
      address: 'Block 4, Room 302, College Campus',
      notes: 'Chief Guide for IoT and Biometric Research projects.',
      profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 86400000 * 5),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Dr. Priya Sharma',
      phone: '+91 9812345678',
      email: 'priya.sharma@college.edu',
      relationship: 'Head of Department',
      company_or_organization: 'Computer Science & Engineering',
      address: 'Faculty Wing, Room 101',
      notes: 'Coordinates department research grants and lab equipment approvals.',
      profile_image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 86400000 * 4),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Vikram Patel',
      phone: '+91 9723456789',
      email: 'vikram.patel@hardwarehub.in',
      relationship: 'Hardware Vendor',
      company_or_organization: 'Embedded Systems Solutions',
      address: '12 Electronics Arcade, Bangalore',
      notes: 'Supplier of AS608 and R307 optical fingerprint modules.',
      profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 86400000 * 3),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Ananya Sen',
      phone: '+91 9654321870',
      email: 'ananya.sen@iotlab.org',
      relationship: 'Lab Assistant',
      company_or_organization: 'Embedded Systems & Robotics Lab',
      address: 'Lab 204, Tech Park',
      notes: 'In charge of ESP32 breadboards and multimeter diagnostics.',
      profile_image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 86400000 * 2),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Suresh Reddy',
      phone: '+91 9543218760',
      email: 'suresh.reddy@securitynet.com',
      relationship: 'Security Consultant',
      company_or_organization: 'CyberSec Protocols Ltd',
      address: 'Tower B, Cyber Gateway, Hyderabad',
      notes: 'Advises on biometric template encryption and sensor protocol hardening.',
      profile_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      created_at: new Date(Date.now() - 86400000 * 1),
      updated_at: new Date()
    }
  ],
  fingerprints: [
    { id: 1, contact_id: 1, fingerprint_id: 27, sensor_type: 'AS608', sensor_identifier: 'ESP32-BIO-01', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    { id: 2, contact_id: 2, fingerprint_id: 12, sensor_type: 'AS608', sensor_identifier: 'ESP32-BIO-01', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    { id: 3, contact_id: 3, fingerprint_id: 5, sensor_type: 'AS608', sensor_identifier: 'ESP32-BIO-01', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    { id: 4, contact_id: 4, fingerprint_id: 18, sensor_type: 'AS608', sensor_identifier: 'ESP32-BIO-01', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() },
    { id: 5, contact_id: 5, fingerprint_id: 9, sensor_type: 'AS608', sensor_identifier: 'ESP32-BIO-01', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() }
  ],
  devices: [
    {
      id: 1,
      device_id: 'ESP32-BIO-01',
      name: 'Main Lab Biometric Scanner',
      sensor_type: 'AS608',
      status: 'ONLINE',
      ip_address: '192.168.1.105',
      template_count: 5,
      firmware_version: '1.2.0',
      last_seen: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      device_id: 'ESP32-BIO-02',
      name: 'Reception Kiosk Terminal',
      sensor_type: 'R307',
      status: 'ONLINE',
      ip_address: '192.168.1.106',
      template_count: 3,
      firmware_version: '1.2.0',
      last_seen: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  recognition_logs: [
    {
      id: 1,
      fingerprint_id: 27,
      contact_id: 1,
      sensor_identifier: 'ESP32-BIO-01',
      status: 'SUCCESS',
      recognized_at: new Date(Date.now() - 15 * 60000),
      device_id: 'ESP32-BIO-01',
      metadata: { confidence: 98, match_time_ms: 420 }
    },
    {
      id: 2,
      fingerprint_id: 12,
      contact_id: 2,
      sensor_identifier: 'ESP32-BIO-01',
      status: 'SUCCESS',
      recognized_at: new Date(Date.now() - 45 * 60000),
      device_id: 'ESP32-BIO-01',
      metadata: { confidence: 95, match_time_ms: 380 }
    },
    {
      id: 3,
      fingerprint_id: null,
      contact_id: null,
      sensor_identifier: 'ESP32-BIO-01',
      status: 'UNKNOWN',
      recognized_at: new Date(Date.now() - 60 * 60000),
      device_id: 'ESP32-BIO-01',
      metadata: { reason: 'Template not found in sensor database' }
    },
    {
      id: 4,
      fingerprint_id: 5,
      contact_id: 3,
      sensor_identifier: 'ESP32-BIO-01',
      status: 'SUCCESS',
      recognized_at: new Date(Date.now() - 180 * 60000),
      device_id: 'ESP32-BIO-01',
      metadata: { confidence: 92, match_time_ms: 460 }
    },
    {
      id: 5,
      fingerprint_id: 18,
      contact_id: 4,
      sensor_identifier: 'ESP32-BIO-01',
      status: 'SUCCESS',
      recognized_at: new Date(Date.now() - 300 * 60000),
      device_id: 'ESP32-BIO-01',
      metadata: { confidence: 99, match_time_ms: 310 }
    }
  ],
  audit_logs: []
};

async function initDb() {
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_WITH_MYSQL) {
    isMockDb = true;
    console.log('[DB] Running in test mode with in-memory database.');
    return;
  }

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'contact_fingerprint_db',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      connectTimeout: 3000
    });

    const connection = await pool.getConnection();
    console.log(`[DB] Connected successfully to MySQL database '${process.env.DB_NAME || 'contact_fingerprint_db'}' on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
    connection.release();
    isMockDb = false;
  } catch (error) {
    isMockDb = true;
    console.warn(`[DB WARNING] Could not connect to MySQL server (${error.message}).`);
    console.warn('[DB] Seamlessly active in resilient in-memory database mode for development & demonstration.');
  }
}

async function query(sql, params = []) {
  if (!isMockDb && pool) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (err) {
      console.error('[DB Query Error]:', err.message);
      throw err;
    }
  }

  // Fallback in-memory query handler (simulates basic SELECT, INSERT, UPDATE, DELETE)
  return executeMockQuery(sql, params);
}

function executeMockQuery(sql, params) {
  const normalizedSql = sql.trim().toUpperCase();

  // 1. SELECT queries
  if (normalizedSql.startsWith('SELECT')) {
    if (normalizedSql.includes('FROM `USERS`') || normalizedSql.includes('FROM USERS')) {
      if (normalizedSql.includes('WHERE `EMAIL` = ?') || normalizedSql.includes('WHERE EMAIL = ?')) {
        const email = params[0];
        const user = mockDb.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
        return user ? [user] : [];
      }
      if (normalizedSql.includes('WHERE `ID` = ?') || normalizedSql.includes('WHERE ID = ?')) {
        const id = parseInt(params[0], 10);
        const user = mockDb.users.find(u => u.id === id);
        return user ? [user] : [];
      }
      return mockDb.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at }));
    }

    if (normalizedSql.includes('FROM `CONTACTS`') || normalizedSql.includes('FROM CONTACTS')) {
      if (normalizedSql.includes('JOIN `FINGERPRINTS`') || normalizedSql.includes('JOIN FINGERPRINTS') || normalizedSql.includes('LEFT JOIN FINGERPRINTS')) {
        return mockDb.contacts.map(c => {
          const fp = mockDb.fingerprints.find(f => f.contact_id === c.id && f.status === 'ACTIVE');
          return {
            ...c,
            fingerprint_id: fp ? fp.fingerprint_id : null,
            sensor_type: fp ? fp.sensor_type : null,
            fingerprint_status: fp ? fp.status : 'UNENROLLED'
          };
        });
      }

      if (normalizedSql.includes('WHERE C.ID = ?') || normalizedSql.includes('WHERE `ID` = ?') || normalizedSql.includes('WHERE ID = ?')) {
        const id = parseInt(params[0], 10);
        const contact = mockDb.contacts.find(c => c.id === id);
        if (!contact) return [];
        const fp = mockDb.fingerprints.find(f => f.contact_id === contact.id && f.status === 'ACTIVE');
        return [{
          ...contact,
          fingerprint_id: fp ? fp.fingerprint_id : null,
          sensor_type: fp ? fp.sensor_type : null,
          fingerprint_status: fp ? fp.status : 'UNENROLLED'
        }];
      }
      return [...mockDb.contacts];
    }

    if (normalizedSql.includes('FROM `FINGERPRINTS`') || normalizedSql.includes('FROM FINGERPRINTS')) {
      if (normalizedSql.includes('WHERE `FINGERPRINT_ID` = ?') || normalizedSql.includes('WHERE FINGERPRINT_ID = ?')) {
        const fpId = parseInt(params[0], 10);
        const fp = mockDb.fingerprints.find(f => f.fingerprint_id === fpId && f.status === 'ACTIVE');
        return fp ? [fp] : [];
      }
      if (normalizedSql.includes('WHERE `CONTACT_ID` = ?') || normalizedSql.includes('WHERE CONTACT_ID = ?')) {
        const cId = parseInt(params[0], 10);
        return mockDb.fingerprints.filter(f => f.contact_id === cId);
      }
      return [...mockDb.fingerprints];
    }

    if (normalizedSql.includes('FROM `DEVICES`') || normalizedSql.includes('FROM DEVICES')) {
      if (normalizedSql.includes('WHERE `DEVICE_ID` = ?') || normalizedSql.includes('WHERE DEVICE_ID = ?')) {
        const devId = params[0];
        const dev = mockDb.devices.find(d => d.device_id === devId);
        return dev ? [dev] : [];
      }
      return [...mockDb.devices];
    }

    if (normalizedSql.includes('FROM `RECOGNITION_LOGS`') || normalizedSql.includes('FROM RECOGNITION_LOGS')) {
      const logs = mockDb.recognition_logs.map(log => {
        const contact = log.contact_id ? mockDb.contacts.find(c => c.id === log.contact_id) : null;
        return {
          ...log,
          contact_name: contact ? contact.name : null,
          contact_phone: contact ? contact.phone : null,
          contact_relationship: contact ? contact.relationship : null
        };
      });
      return logs.sort((a, b) => new Date(b.recognized_at) - new Date(a.recognized_at));
    }
  }

  // 2. INSERT queries
  if (normalizedSql.startsWith('INSERT')) {
    if (normalizedSql.includes('INTO `CONTACTS`') || normalizedSql.includes('INTO CONTACTS')) {
      const newContact = {
        id: mockDb.contacts.length ? Math.max(...mockDb.contacts.map(c => c.id)) + 1 : 1,
        name: params[0],
        phone: params[1],
        email: params[2] || null,
        relationship: params[3] || null,
        company_or_organization: params[4] || null,
        address: params[5] || null,
        notes: params[6] || null,
        profile_image: params[7] || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockDb.contacts.push(newContact);
      return { insertId: newContact.id, affectedRows: 1 };
    }

    if (normalizedSql.includes('INTO `FINGERPRINTS`') || normalizedSql.includes('INTO FINGERPRINTS')) {
      // Remove any existing active fingerprint for this contact or slot
      const contact_id = parseInt(params[0], 10);
      const fingerprint_id = parseInt(params[1], 10);
      const sensor_type = params[2] || 'AS608';
      const sensor_identifier = params[3] || 'ESP32-BIO-01';

      // Check slot conflict
      const existing = mockDb.fingerprints.find(f => f.fingerprint_id === fingerprint_id && f.sensor_identifier === sensor_identifier);
      if (existing) {
        existing.contact_id = contact_id;
        existing.status = 'ACTIVE';
        existing.updated_at = new Date();
        return { insertId: existing.id, affectedRows: 1 };
      }

      const newFp = {
        id: mockDb.fingerprints.length ? Math.max(...mockDb.fingerprints.map(f => f.id)) + 1 : 1,
        contact_id,
        fingerprint_id,
        sensor_type,
        sensor_identifier,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      };
      mockDb.fingerprints.push(newFp);
      return { insertId: newFp.id, affectedRows: 1 };
    }

    if (normalizedSql.includes('INTO `RECOGNITION_LOGS`') || normalizedSql.includes('INTO RECOGNITION_LOGS')) {
      const newLog = {
        id: mockDb.recognition_logs.length ? Math.max(...mockDb.recognition_logs.map(l => l.id)) + 1 : 1,
        fingerprint_id: params[0] || null,
        contact_id: params[1] || null,
        sensor_identifier: params[2] || 'ESP32-BIO-01',
        status: params[3] || 'SUCCESS',
        device_id: params[4] || 'ESP32-BIO-01',
        metadata: params[5] ? (typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5]) : null,
        recognized_at: new Date()
      };
      mockDb.recognition_logs.unshift(newLog);
      return { insertId: newLog.id, affectedRows: 1 };
    }

    if (normalizedSql.includes('INTO `USERS`') || normalizedSql.includes('INTO USERS')) {
      const newUser = {
        id: mockDb.users.length ? Math.max(...mockDb.users.map(u => u.id)) + 1 : 1,
        name: params[0],
        email: params[1],
        password_hash: params[2],
        role: params[3] || 'USER',
        created_at: new Date(),
        updated_at: new Date()
      };
      mockDb.users.push(newUser);
      return { insertId: newUser.id, affectedRows: 1 };
    }

    if (normalizedSql.includes('INTO `DEVICES`') || normalizedSql.includes('INTO DEVICES')) {
      const newDevice = {
        id: mockDb.devices.length ? Math.max(...mockDb.devices.map(d => d.id)) + 1 : 1,
        device_id: params[0],
        name: params[1],
        sensor_type: params[2] || 'AS608',
        status: 'ONLINE',
        ip_address: params[3] || '127.0.0.1',
        template_count: 0,
        firmware_version: '1.0.0',
        last_seen: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      mockDb.devices.push(newDevice);
      return { insertId: newDevice.id, affectedRows: 1 };
    }
  }

  // 3. UPDATE queries
  if (normalizedSql.startsWith('UPDATE')) {
    if (normalizedSql.includes('`CONTACTS`') || normalizedSql.includes('CONTACTS')) {
      const id = parseInt(params[params.length - 1], 10);
      const contact = mockDb.contacts.find(c => c.id === id);
      if (contact) {
        contact.name = params[0] !== undefined ? params[0] : contact.name;
        contact.phone = params[1] !== undefined ? params[1] : contact.phone;
        contact.email = params[2] !== undefined ? params[2] : contact.email;
        contact.relationship = params[3] !== undefined ? params[3] : contact.relationship;
        contact.company_or_organization = params[4] !== undefined ? params[4] : contact.company_or_organization;
        contact.address = params[5] !== undefined ? params[5] : contact.address;
        contact.notes = params[6] !== undefined ? params[6] : contact.notes;
        if (params[7] !== undefined) contact.profile_image = params[7];
        contact.updated_at = new Date();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    if (normalizedSql.includes('`DEVICES`') || normalizedSql.includes('DEVICES')) {
      const devId = params[params.length - 1];
      const device = mockDb.devices.find(d => d.device_id === devId || d.id === parseInt(devId, 10));
      if (device) {
        device.status = params[0] || device.status;
        device.last_seen = new Date();
        device.updated_at = new Date();
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }
  }

  // 4. DELETE queries
  if (normalizedSql.startsWith('DELETE')) {
    if (normalizedSql.includes('FROM `CONTACTS`') || normalizedSql.includes('FROM CONTACTS')) {
      const id = parseInt(params[0], 10);
      const initialLen = mockDb.contacts.length;
      mockDb.contacts = mockDb.contacts.filter(c => c.id !== id);
      mockDb.fingerprints = mockDb.fingerprints.filter(f => f.contact_id !== id);
      return { affectedRows: initialLen - mockDb.contacts.length };
    }

    if (normalizedSql.includes('FROM `FINGERPRINTS`') || normalizedSql.includes('FROM FINGERPRINTS')) {
      const id = parseInt(params[0], 10);
      const initialLen = mockDb.fingerprints.length;
      mockDb.fingerprints = mockDb.fingerprints.filter(f => f.id !== id && f.fingerprint_id !== id);
      return { affectedRows: initialLen - mockDb.fingerprints.length };
    }
  }

  return { affectedRows: 0 };
}

module.exports = {
  initDb,
  query,
  isMock: () => isMockDb,
  getMockDb: () => mockDb
};
