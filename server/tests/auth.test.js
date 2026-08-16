const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await db.initDb();
});

describe('Authentication API Endpoints', () => {
  let authToken = '';

  test('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('Contact Recognition API');
  });

  test('POST /api/auth/login fails with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@biocontact.local',
        password: 'wrongpassword'
      });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@biocontact.local',
        password: 'admin123'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@biocontact.local');
    expect(res.body.user.role).toBe('ADMIN');
    authToken = res.body.token;
  });

  test('GET /api/auth/me succeeds with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@biocontact.local');
  });

  test('GET /api/auth/me fails without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
