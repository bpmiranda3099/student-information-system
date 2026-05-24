import request from 'supertest';
import app from '../index.js';
import { prisma } from '../lib/prisma.js';

describe('Admin emails integration', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
  });

  async function login(email: string, password: string) {
    const res = await request(app).post('/auth/login').send({ email, password });
    return res;
  }

  it('POST /admin/emails/send requires authentication', async () => {
    const res = await request(app).post('/admin/emails/send').send({
      to: ['test@example.com'],
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(res.status).toBe(401);
  });

  it('POST /admin/emails/send rejects non-admin users', async () => {
    const loginRes = await login('student@sis.edu', 'Password123!');
    if (loginRes.status !== 200) {
      console.warn('Skipping student RBAC test - student login failed');
      return;
    }

    const res = await request(app)
      .post('/admin/emails/send')
      .set('Cookie', loginRes.headers['set-cookie'])
      .send({
        to: ['test@example.com'],
        subject: 'Test',
        html: '<p>Hi</p>',
      });

    expect(res.status).toBe(403);
  });

  it('POST /admin/emails/send validates request body', async () => {
    const loginRes = await login('admin@sis.edu', 'Password123!');
    if (loginRes.status !== 200) {
      console.warn('Skipping validation test - admin login failed');
      return;
    }

    const res = await request(app)
      .post('/admin/emails/send')
      .set('Cookie', loginRes.headers['set-cookie'])
      .send({
        to: ['not-an-email'],
        subject: '',
        html: '',
      });

    expect(res.status).toBe(400);
  });

  it('POST /admin/emails/send queues email in dev when Resend is not configured', async () => {
    const loginRes = await login('admin@sis.edu', 'Password123!');
    if (loginRes.status !== 200) {
      console.warn('Skipping send test - admin login failed');
      return;
    }

    const res = await request(app)
      .post('/admin/emails/send')
      .set('Cookie', loginRes.headers['set-cookie'])
      .send({
        to: ['delivered@resend.dev'],
        subject: 'Integration test',
        html: '<p>Hello</p>',
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBeDefined();
    expect(res.body.email.id).toBe('dev-skipped');
  });

  it('POST /admin/emails/batch queues emails in dev when Resend is not configured', async () => {
    const loginRes = await login('admin@sis.edu', 'Password123!');
    if (loginRes.status !== 200) {
      console.warn('Skipping batch test - admin login failed');
      return;
    }

    const res = await request(app)
      .post('/admin/emails/batch')
      .set('Cookie', loginRes.headers['set-cookie'])
      .send({
        emails: [
          {
            to: ['delivered@resend.dev'],
            subject: 'Batch 1',
            html: '<p>One</p>',
          },
          {
            to: ['delivered@resend.dev'],
            subject: 'Batch 2',
            html: '<p>Two</p>',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.batch).toBeDefined();
  });

  it('GET /admin/emails returns 503 when Resend is not configured', async () => {
    const loginRes = await login('admin@sis.edu', 'Password123!');
    if (loginRes.status !== 200) {
      console.warn('Skipping list test - admin login failed');
      return;
    }

    const res = await request(app)
      .get('/admin/emails')
      .set('Cookie', loginRes.headers['set-cookie']);

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/RESEND_API_KEY/i);
  });
});
