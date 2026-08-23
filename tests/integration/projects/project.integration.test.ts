import request from 'supertest';
import app from '../../../src/app';
import { testPrisma } from '../../setup';
import { hashPassword } from '../../../src/utils/password';

describe('Integration Tests: Projects CRUD & Dashboard (/projects)', () => {
  let adminToken: string;
  let memberToken: string;
  let orgId: string;
  let createdProjectId: string;

  beforeAll(async () => {
    const org = await testPrisma.organization.create({ data: { name: 'Project Integration Org' } });
    orgId = org.id;

    const passHash = await hashPassword('Password123!');
    const adminUser = await testPrisma.user.create({
      data: { email: 'proj.admin@example.com', name: 'Proj Admin', password_hash: passHash },
    });
    const memberUser = await testPrisma.user.create({
      data: { email: 'proj.member@example.com', name: 'Proj Member', password_hash: passHash },
    });

    await testPrisma.orgMember.createMany({
      data: [
        { organization_id: org.id, user_id: adminUser.id, role: 'org_admin' },
        { organization_id: org.id, user_id: memberUser.id, role: 'member' },
      ],
    });

    // Login to acquire tokens
    const adminLogin = await request(app).post('/auth/login').send({ email: 'proj.admin@example.com', password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    const memberLogin = await request(app).post('/auth/login').send({ email: 'proj.member@example.com', password: 'Password123!' });
    memberToken = memberLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await testPrisma.task.deleteMany({ where: { project: { organization_id: orgId } } });
    await testPrisma.project.deleteMany({ where: { organization_id: orgId } });
    await testPrisma.orgMember.deleteMany({ where: { organization_id: orgId } });
    await testPrisma.user.deleteMany({ where: { email: { in: ['proj.admin@example.com', 'proj.member@example.com'] } } });
    await testPrisma.organization.deleteMany({ where: { id: orgId } });
  });

  it('POST /projects should create project for authenticated member', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Integration Test Project', description: 'Testing project creation' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Integration Test Project');
    createdProjectId = res.body.data.id;
  });

  it('GET /projects should list organization projects with pagination', async () => {
    const res = await request(app)
      .get('/projects?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /projects/:id/dashboard should return status count object', async () => {
    const res = await request(app)
      .get(`/projects/${createdProjectId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      todo: expect.any(Number),
      in_progress: expect.any(Number),
      review: expect.any(Number),
      done: expect.any(Number),
    });
  });

  it('DELETE /projects/:id as member should return 403 FORBIDDEN', async () => {
    const res = await request(app)
      .delete(`/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('DELETE /projects/:id as org_admin should return 200 OK', async () => {
    const res = await request(app)
      .delete(`/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Project deleted successfully');
  });
});
