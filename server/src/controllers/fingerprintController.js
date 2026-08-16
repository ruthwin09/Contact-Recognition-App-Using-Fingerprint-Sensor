const db = require('../config/db');
const fingerprintService = require('../services/FingerprintService');

// POST /api/fingerprints/enroll
async function enrollFingerprint(req, res) {
  try {
    const { contactId, preferredSlot } = req.body;
    const cId = parseInt(contactId, 10);

    // Validate contact exists
    const contacts = await db.query('SELECT id, name FROM contacts WHERE id = ?', [cId]);
    if (!contacts || contacts.length === 0) {
      return res.status(404).json({ success: false, message: `Contact with ID ${cId} not found.` });
    }

    // Check for existing active fingerprint on this contact
    const existing = await db.query(
      'SELECT id, fingerprint_id FROM fingerprints WHERE contact_id = ? AND status = ?',
      [cId, 'ACTIVE']
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Contact already has an enrolled fingerprint (slot #${existing[0].fingerprint_id}). Revoke it first before re-enrolling.`,
        existingSlot: existing[0].fingerprint_id
      });
    }

    // Delegate to hardware/mock adapter
    const enrollResult = await fingerprintService.enroll({ contactId: cId, preferredSlot });

    if (!enrollResult.success) {
      return res.status(500).json({
        success: false,
        message: enrollResult.message || 'Fingerprint enrollment failed.',
        mode: enrollResult.mode
      });
    }

    // Persist fingerprint-contact mapping in DB
    const sensorId = process.env.DEFAULT_DEVICE_ID || 'ESP32-BIO-01';
    const sensorType = fingerprintService.isMockMode() ? 'MOCK'
      : (process.env.DEFAULT_SENSOR_TYPE || 'AS608');

    await db.query(
      'INSERT INTO fingerprints (contact_id, fingerprint_id, sensor_type, sensor_identifier, status) VALUES (?, ?, ?, ?, ?)',
      [cId, enrollResult.fingerprintId, sensorType, sensorId, 'ACTIVE']
    );

    return res.status(201).json({
      success: true,
      message: enrollResult.message,
      fingerprintId: enrollResult.fingerprintId,
      contactId: cId,
      contactName: contacts[0].name,
      sensorType,
      mode: enrollResult.mode,
      isMockMode: fingerprintService.isMockMode()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Fingerprint enrollment error.',
      error: error.message
    });
  }
}

// POST /api/fingerprints/identify — ESP32 pushes recognition events here
async function identifyFingerprint(req, res) {
  try {
    const { fingerprintId, deviceId, confidence, metadata } = req.body;
    const sensorId = deviceId || process.env.DEFAULT_DEVICE_ID || 'ESP32-BIO-01';

    let contact = null;
    let logStatus = 'UNKNOWN';

    if (fingerprintId !== undefined && fingerprintId !== null) {
      const fpId = parseInt(fingerprintId, 10);

      // Look up fingerprint-contact mapping
      const fps = await db.query(
        'SELECT f.contact_id FROM fingerprints f WHERE f.fingerprint_id = ? AND f.sensor_identifier = ? AND f.status = ?',
        [fpId, sensorId, 'ACTIVE']
      );

      if (fps && fps.length > 0) {
        const cId = fps[0].contact_id;
        const contacts = await db.query(
          'SELECT id, name, phone, email, relationship, company_or_organization, profile_image FROM contacts WHERE id = ?',
          [cId]
        );
        if (contacts && contacts.length > 0) {
          contact = contacts[0];
          logStatus = 'SUCCESS';
        }
      }
    }

    // Write recognition log
    await db.query(
      'INSERT INTO recognition_logs (fingerprint_id, contact_id, sensor_identifier, status, device_id, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [
        fingerprintId !== undefined ? parseInt(fingerprintId, 10) : null,
        contact ? contact.id : null,
        sensorId,
        logStatus,
        sensorId,
        JSON.stringify(metadata || { confidence: confidence || null, mode: fingerprintService.isMockMode() ? 'mock' : 'hardware' })
      ]
    );

    if (contact) {
      return res.status(200).json({
        success: true,
        status: 'RECOGNIZED',
        fingerprintId,
        contact,
        recognizedAt: new Date().toISOString(),
        mode: fingerprintService.isMockMode() ? 'mock' : 'hardware'
      });
    } else {
      return res.status(200).json({
        success: true,
        status: 'UNKNOWN',
        fingerprintId: fingerprintId || null,
        contact: null,
        recognizedAt: new Date().toISOString(),
        mode: fingerprintService.isMockMode() ? 'mock' : 'hardware'
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Fingerprint identification failed.', error: error.message });
  }
}

// POST /api/fingerprints/scan — Trigger sensor scan from frontend (mock/hardware)
async function triggerScan(req, res) {
  try {
    const scanResult = await fingerprintService.identify();

    if (scanResult.status === 'ERROR') {
      return res.status(503).json({
        success: false,
        status: 'ERROR',
        message: scanResult.message || 'Fingerprint sensor is offline or unresponsive.',
        mode: scanResult.mode
      });
    }

    // Delegate to identify logic
    req.body.fingerprintId = scanResult.fingerprintId;
    req.body.confidence = scanResult.confidence;
    req.body.metadata = { confidence: scanResult.confidence, mode: scanResult.mode };
    return identifyFingerprint(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Scan trigger failed.', error: error.message });
  }
}

// GET /api/fingerprints — All enrolled fingerprints
async function getFingerprints(req, res) {
  try {
    const fingerprints = await db.query(
      `SELECT f.id, f.fingerprint_id, f.sensor_type, f.sensor_identifier, f.status,
              f.created_at, f.updated_at, c.name as contact_name, c.phone as contact_phone
       FROM fingerprints f
       LEFT JOIN contacts c ON f.contact_id = c.id
       ORDER BY f.created_at DESC`
    );

    // Fix: handle mock db returning contacts_table joined data
    const safe = Array.isArray(fingerprints) ? fingerprints : [];

    return res.status(200).json({
      success: true,
      count: safe.length,
      fingerprints: safe,
      mode: fingerprintService.isMockMode() ? 'mock' : 'hardware',
      isMockMode: fingerprintService.isMockMode()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve fingerprints.', error: error.message });
  }
}

// DELETE /api/fingerprints/:id — Revoke a fingerprint mapping
async function deleteFingerprint(req, res) {
  try {
    const fpId = parseInt(req.params.id, 10);
    if (isNaN(fpId)) return res.status(400).json({ success: false, message: 'Invalid fingerprint ID.' });

    const fps = await db.query('SELECT id, fingerprint_id FROM fingerprints WHERE id = ?', [fpId]);
    if (!fps || fps.length === 0) {
      return res.status(404).json({ success: false, message: `Fingerprint record ID ${fpId} not found.` });
    }

    const sensorSlot = fps[0].fingerprint_id;

    // Delete from sensor (hardware or mock)
    await fingerprintService.deleteTemplate(sensorSlot);

    // Remove from database
    await db.query('DELETE FROM fingerprints WHERE id = ?', [fpId]);

    return res.status(200).json({
      success: true,
      message: `Fingerprint slot #${sensorSlot} revoked and removed.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to revoke fingerprint.', error: error.message });
  }
}

// GET /api/fingerprints/status — Sensor hardware status
async function getSensorStatus(req, res) {
  try {
    const status = await fingerprintService.getStatus();
    return res.status(200).json({
      success: true,
      ...status,
      isMockMode: fingerprintService.isMockMode()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to get sensor status.', error: error.message });
  }
}

module.exports = {
  enrollFingerprint,
  identifyFingerprint,
  triggerScan,
  getFingerprints,
  deleteFingerprint,
  getSensorStatus
};
