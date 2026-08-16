function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }

  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 4 characters long.'
    });
  }

  next();
}

function validateContact(req, res, next) {
  const { name, phone, email } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Contact name is required.'
    });
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.'
    });
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact email format.'
      });
    }
  }

  next();
}

function validateEnrollment(req, res, next) {
  const { contactId, fingerprintId } = req.body;

  if (!contactId || isNaN(parseInt(contactId, 10))) {
    return res.status(400).json({
      success: false,
      message: 'A valid numeric contactId is required for biometric enrollment.'
    });
  }

  if (fingerprintId !== undefined && (isNaN(parseInt(fingerprintId, 10)) || parseInt(fingerprintId, 10) < 1 || parseInt(fingerprintId, 10) > 1000)) {
    return res.status(400).json({
      success: false,
      message: 'Fingerprint slot ID must be an integer between 1 and 1000.'
    });
  }

  next();
}

module.exports = {
  validateLogin,
  validateContact,
  validateEnrollment
};
