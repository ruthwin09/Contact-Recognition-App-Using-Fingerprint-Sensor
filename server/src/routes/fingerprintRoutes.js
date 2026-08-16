const express = require('express');
const router = express.Router();
const fingerprintController = require('../controllers/fingerprintController');
const { requireAuth } = require('../middleware/auth');
const { validateEnrollment } = require('../middleware/validate');

router.use(requireAuth);

router.get('/status', fingerprintController.getSensorStatus);
router.get('/', fingerprintController.getFingerprints);
router.post('/enroll', validateEnrollment, fingerprintController.enrollFingerprint);
router.post('/identify', fingerprintController.identifyFingerprint);
router.post('/scan', fingerprintController.triggerScan);
router.delete('/:id', fingerprintController.deleteFingerprint);

module.exports = router;
