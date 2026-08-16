const db = require('../config/db');

// GET /api/contacts - Retrieve contacts with optional search, filter, and sort
async function getContacts(req, res) {
  try {
    const { search, relationship, hasFingerprint, sort = 'name', order = 'ASC' } = req.query;

    let sql = `
      SELECT 
        c.id, c.name, c.phone, c.email, c.relationship, 
        c.company_or_organization, c.address, c.notes, c.profile_image, 
        c.created_at, c.updated_at,
        f.fingerprint_id, f.sensor_type, f.status AS fingerprint_status
      FROM contacts c
      LEFT JOIN fingerprints f ON c.id = f.contact_id AND f.status = 'ACTIVE'
    `;

    const params = [];
    const conditions = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.company_or_organization LIKE ?)');
      params.push(term, term, term, term);
    }

    if (relationship && relationship.trim()) {
      conditions.push('c.relationship = ?');
      params.push(relationship.trim());
    }

    if (hasFingerprint === 'true') {
      conditions.push('f.fingerprint_id IS NOT NULL');
    } else if (hasFingerprint === 'false') {
      conditions.push('f.fingerprint_id IS NULL');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const validSortCols = {
      name: 'c.name',
      created_at: 'c.created_at',
      relationship: 'c.relationship'
    };
    const sortCol = validSortCols[sort] || 'c.name';
    const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortCol} ${sortDir}`;

    const contacts = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      count: contacts.length,
      contacts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve contacts list.',
      error: error.message
    });
  }
}

// GET /api/contacts/:id - Retrieve single contact profile with biometric status & recent scans
async function getContactById(req, res) {
  try {
    const contactId = parseInt(req.params.id, 10);
    if (isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'Invalid contact ID.' });
    }

    const contacts = await db.query(
      `SELECT 
        c.id, c.name, c.phone, c.email, c.relationship, 
        c.company_or_organization, c.address, c.notes, c.profile_image, 
        c.created_at, c.updated_at,
        f.id AS fingerprint_record_id, f.fingerprint_id, f.sensor_type, f.sensor_identifier, f.status AS fingerprint_status
      FROM contacts c
      LEFT JOIN fingerprints f ON c.id = f.contact_id AND f.status = 'ACTIVE'
      WHERE c.id = ?`,
      [contactId]
    );

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Contact with ID ${contactId} not found.`
      });
    }

    const contact = contacts[0];

    // Fetch recent recognition events for this contact
    const recentLogs = await db.query(
      'SELECT id, fingerprint_id, sensor_identifier, status, recognized_at, device_id, metadata FROM recognition_logs WHERE contact_id = ? ORDER BY recognized_at DESC LIMIT 5',
      [contactId]
    );

    return res.status(200).json({
      success: true,
      contact: {
        ...contact,
        recent_recognitions: recentLogs || []
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact profile.',
      error: error.message
    });
  }
}

// POST /api/contacts - Create a new contact
async function createContact(req, res) {
  try {
    const {
      name,
      phone,
      email,
      relationship,
      company_or_organization,
      address,
      notes,
      profile_image
    } = req.body;

    const result = await db.query(
      `INSERT INTO contacts 
        (name, phone, email, relationship, company_or_organization, address, notes, profile_image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        phone.trim(),
        email ? email.trim().toLowerCase() : null,
        relationship ? relationship.trim() : null,
        company_or_organization ? company_or_organization.trim() : null,
        address ? address.trim() : null,
        notes ? notes.trim() : null,
        profile_image || null
      ]
    );

    const newContactId = result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Contact created successfully.',
      contact: {
        id: newContactId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim().toLowerCase() : null,
        relationship: relationship ? relationship.trim() : null,
        company_or_organization: company_or_organization ? company_or_organization.trim() : null,
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
        profile_image: profile_image || null,
        fingerprint_id: null,
        fingerprint_status: 'UNENROLLED'
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create contact.',
      error: error.message
    });
  }
}

// PUT /api/contacts/:id - Update an existing contact
async function updateContact(req, res) {
  try {
    const contactId = parseInt(req.params.id, 10);
    if (isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'Invalid contact ID.' });
    }

    const {
      name,
      phone,
      email,
      relationship,
      company_or_organization,
      address,
      notes,
      profile_image
    } = req.body;

    const existing = await db.query('SELECT id FROM contacts WHERE id = ?', [contactId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Contact with ID ${contactId} not found.`
      });
    }

    await db.query(
      `UPDATE contacts 
       SET name = ?, phone = ?, email = ?, relationship = ?, 
           company_or_organization = ?, address = ?, notes = ?, profile_image = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name ? name.trim() : existing[0].name,
        phone ? phone.trim() : existing[0].phone,
        email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing[0].email,
        relationship !== undefined ? relationship : existing[0].relationship,
        company_or_organization !== undefined ? company_or_organization : existing[0].company_or_organization,
        address !== undefined ? address : existing[0].address,
        notes !== undefined ? notes : existing[0].notes,
        profile_image !== undefined ? profile_image : existing[0].profile_image,
        contactId
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Contact updated successfully.',
      contactId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update contact.',
      error: error.message
    });
  }
}

// DELETE /api/contacts/:id - Delete contact
async function deleteContact(req, res) {
  try {
    const contactId = parseInt(req.params.id, 10);
    if (isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'Invalid contact ID.' });
    }

    const result = await db.query('DELETE FROM contacts WHERE id = ?', [contactId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Contact with ID ${contactId} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Contact and associated biometric mapping deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete contact.',
      error: error.message
    });
  }
}

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact
};
