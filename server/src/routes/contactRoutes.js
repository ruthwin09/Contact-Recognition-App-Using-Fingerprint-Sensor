const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { requireAuth } = require('../middleware/auth');
const { validateContact } = require('../middleware/validate');

// All contact routes require valid authentication
router.use(requireAuth);

router.get('/', contactController.getContacts);
router.get('/:id', contactController.getContactById);
router.post('/', validateContact, contactController.createContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
