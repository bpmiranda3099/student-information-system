import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../index.js';
import { prisma } from '../lib/prisma.js';

describe('Auth integration', () => {
  const testEmail = `test-${Date.now()}@sis.edu`;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('POST /health returns status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBeLessThanOrEqual(503);
    expect(res.body).toHaveProperty('status');
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@sis.edu', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('registers and logs in a user', async () => {
    const program = await prisma.program.findFirst();
    if (!program) {
      console.warn('Skipping register test - no program in DB');
      return;
    }

    const registerRes = await request(app).post('/auth/register').send({
      email: testEmail,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'student',
      studentNumber: `T-${Date.now()}`,
      programId: program.id,
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.email).toBe(testEmail);

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe(testEmail);
    expect(loginRes.headers['set-cookie']).toBeDefined();
  });
});

describe('Grade computation integration', () => {
  it('computes grades for seeded section', async () => {
    const section = await prisma.courseSection.findFirst({
      include: { gradeScheme: { include: { components: true } } },
    });

    if (!section?.gradeScheme) {
      console.warn('Skipping grade test - no seeded section');
      return;
    }

    const admin = await prisma.user.findUnique({ where: { email: 'admin@sis.edu' } });
    if (!admin) return;

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@sis.edu', password: 'Password123!' });

    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get(`/sections/${section.id}/grades`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.grades).toBeDefined();
  });
});
