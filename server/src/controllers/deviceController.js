const db = require('../config/db');

// GET /api/devices
async function getDevices(req, res) {
  try {
    const devices = await db.query('SELECT * FROM devices ORDER BY created_at DESC');
    return res.status(200).json({ success: true, count: devices.length, devices });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve devices.', error: error.message });
  }
}

// GET /api/devices/:deviceId/status
async function getDeviceStatus(req, res) {
  try {
    const { deviceId } = req.params;
    const devices = await db.query('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
    if (!devices || devices.length === 0) {
      return res.status(404).json({ success: false, message: `Device ${deviceId} not found.` });
    }
    return res.status(200).json({ success: true, device: devices[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to get device status.', error: error.message });
  }
}

// POST /api/devices/heartbeat — ESP32 device registration and heartbeat
async function heartbeat(req, res) {
  try {
    const { device_id, name, sensor_type, ip_address, template_count, firmware_version } = req.body;

    if (!device_id) {
      return res.status(400).json({ success: false, message: 'device_id is required.' });
    }

    const existing = await db.query('SELECT id FROM devices WHERE device_id = ?', [device_id]);

    if (existing && existing.length > 0) {
      await db.query(
        'UPDATE devices SET status = ?, last_seen = NOW(), template_count = ?, ip_address = ?, updated_at = NOW() WHERE device_id = ?',
        ['ONLINE', template_count || 0, ip_address || null, device_id]
      );
    } else {
      await db.query(
        'INSERT INTO devices (device_id, name, sensor_type, status, ip_address, template_count, firmware_version, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [
          device_id,
          name || `BioScanner-${device_id}`,
          sensor_type || 'AS608',
          'ONLINE',
          ip_address || null,
          template_count || 0,
          firmware_version || '1.0.0'
        ]
      );
    }

    return res.status(200).json({ success: true, message: 'Heartbeat received.', timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Device heartbeat failed.', error: error.message });
  }
}

module.exports = { getDevices, getDeviceStatus, heartbeat };
