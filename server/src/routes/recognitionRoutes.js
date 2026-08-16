const express = require('express');
const router = express.Router();
const recognitionController = require('../controllers/recognitionController');
const deviceController = require('../controllers/deviceController');
const { requireAuth } = require('../middleware/auth');

// Recognition history and stats (authenticated)
router.get('/history', requireAuth, recognitionController.getHistory);
router.get('/stats', requireAuth, recognitionController.getStats);

// Dashboard stats (authenticated)
router.get('/dashboard', requireAuth, recognitionController.getDashboardStats);

// Devices (authenticated)
router.get('/devices', requireAuth, deviceController.getDevices);
router.get('/devices/:deviceId/status', requireAuth, deviceController.getDeviceStatus);

// ESP32 heartbeat — uses device API key, not JWT
router.post('/devices/heartbeat', deviceController.heartbeat);

module.exports = router;
