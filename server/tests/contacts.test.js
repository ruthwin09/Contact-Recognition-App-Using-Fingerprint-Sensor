const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

let authToken = '';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await db.initDb();

  // Login to get token
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@biocontact.local',
      password: 'admin123'
    });
  authToken = res.body.token;
});

describe('Contact Management API', () => {
  let createdContactId = null;

  test('GET /api/contacts requires authentication', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/contacts returns contacts list with token', async () => {
    const res = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.contacts)).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test('POST /api/contacts validates required fields', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: 'incomplete@test.com'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/contacts successfully creates a new contact', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Amitabh Verma',
        phone: '+91 9123456780',
        email: 'amitabh.verma@college.edu',
        relationship: 'External Examiner',
        company_or_organization: 'National Institute of Tech',
        address: 'Faculty Guest House, Suite 4',
        notes: 'External evaluator for final year capstone project viva.'
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.contact.id).toBeDefined();
    expect(res.body.contact.name).toBe('Amitabh Verma');
    createdContactId = res.body.contact.id;
  });

  test('GET /api/contacts/:id returns contact details', async () => {
    const res = await request(app)
      .get(`/api/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.contact.id).toBe(createdContactId);
    expect(res.body.contact.name).toBe('Amitabh Verma');
  });

  test('PUT /api/contacts/:id updates contact info', async () => {
    const res = await request(app)
      .put(`/api/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Dr. Amitabh Verma',
        phone: '+91 9123456780',
        relationship: 'Chief External Examiner'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/contacts/:id removes contact', async () => {
    const res = await request(app)
      .delete(`/api/contacts/${createdContactId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
