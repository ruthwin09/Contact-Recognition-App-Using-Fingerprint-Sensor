const db = require('../config/db');

// GET /api/recognition/history
async function getHistory(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const params = [];
    let whereClause = '';

    if (status && ['SUCCESS', 'UNKNOWN', 'ERROR'].includes(status.toUpperCase())) {
      whereClause = 'WHERE rl.status = ?';
      params.push(status.toUpperCase());
    }

    const logs = await db.query(
      `SELECT rl.id, rl.fingerprint_id, rl.contact_id, rl.sensor_identifier,
              rl.status, rl.recognized_at, rl.device_id, rl.metadata,
              c.name as contact_name, c.phone as contact_phone, c.relationship as contact_relationship
       FROM recognition_logs rl
       LEFT JOIN contacts c ON rl.contact_id = c.id
       ${whereClause}
       ORDER BY rl.recognized_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve recognition history.', error: error.message });
  }
}

// GET /api/recognition/stats
async function getStats(req, res) {
  try {
    const logs = await db.query(
      'SELECT status, recognized_at, contact_id FROM recognition_logs ORDER BY recognized_at DESC'
    );

    const totalScans = logs.length;
    const successful = logs.filter(l => l.status === 'SUCCESS').length;
    const unknown = logs.filter(l => l.status === 'UNKNOWN').length;
    const errors = logs.filter(l => l.status === 'ERROR').length;

    // Today's scans
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayScans = logs.filter(l => new Date(l.recognized_at) >= today).length;

    // Hourly distribution (last 24h)
    const now = Date.now();
    const last24h = logs.filter(l => (now - new Date(l.recognized_at).getTime()) <= 86400000);
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: last24h.filter(l => new Date(l.recognized_at).getHours() === i).length
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalScans,
        successful,
        unknown,
        errors,
        todayScans,
        successRate: totalScans > 0 ? Math.round((successful / totalScans) * 100) : 0,
        hourlyActivity
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats.', error: error.message });
  }
}

// GET /api/dashboard/stats
async function getDashboardStats(req, res) {
  try {
    const contacts = await db.query('SELECT id FROM contacts');
    const fingerprints = await db.query("SELECT id FROM fingerprints WHERE status = 'ACTIVE'");
    const devices = await db.query('SELECT id, status FROM devices');
    const logs = await db.query(
      'SELECT rl.id, rl.status, rl.recognized_at, rl.device_id, rl.fingerprint_id, c.name as contact_name, c.profile_image FROM recognition_logs rl LEFT JOIN contacts c ON rl.contact_id = c.id ORDER BY rl.recognized_at DESC LIMIT 10'
    );

    const allLogs = await db.query('SELECT status FROM recognition_logs');
    const totalScans = allLogs.length;
    const successful = allLogs.filter(l => l.status === 'SUCCESS').length;
    const unknown = allLogs.filter(l => l.status === 'UNKNOWN').length;

    return res.status(200).json({
      success: true,
      stats: {
        totalContacts: (contacts || []).length,
        enrolledFingerprints: (fingerprints || []).length,
        connectedDevices: (devices || []).filter(d => d.status === 'ONLINE').length,
        totalDevices: (devices || []).length,
        successfulRecognitions: successful,
        unknownAttempts: unknown,
        totalScans,
        successRate: totalScans > 0 ? Math.round((successful / totalScans) * 100) : 0,
        recentActivity: logs || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Dashboard stats failed.', error: error.message });
  }
}

module.exports = {
  getHistory,
  getStats,
  getDashboardStats
};
