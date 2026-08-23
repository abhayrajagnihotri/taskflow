import request from 'supertest';
import app from '../../../src/app';
import { testPrisma } from '../../setup';
import { hashPassword } from '../../../src/utils/password';

describe('Integration Tests: Authentication Flow (/auth)', () => {
  const testEmail = 'login.test@example.com';
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Setup test organization & user in test database
    const org = await testPrisma.organization.create({
      data: { name: 'Login Test Org' },
    });

    const password_hash = await hashPassword(testPassword);
    const user = await testPrisma.user.create({
      data: {
        email: testEmail,
        name: 'Login Tester',
        password_hash,
      },
    });

    await testPrisma.orgMember.create({
      data: {
        organization_id: org.id,
        user_id: user.id,
        role: 'org_admin',
      },
    });
  });

  afterAll(async () => {
    await testPrisma.refreshToken.deleteMany();
    await testPrisma.orgMember.deleteMany({ where: { user: { email: testEmail } } });
    await testPrisma.user.deleteMany({ where: { email: testEmail } });
    await testPrisma.organization.deleteMany({ where: { name: 'Login Test Org' } });
  });

  it('POST /auth/login should authenticate valid credentials and return tokens without password_hash', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
  });

  it('POST /auth/login should return 401 for incorrect password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: 'WrongPassword999!' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/login should return generic 401 for nonexistent email', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent.user@example.com', password: 'Password123!' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });
});
