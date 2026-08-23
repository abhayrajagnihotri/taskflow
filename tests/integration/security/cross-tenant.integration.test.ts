import request from 'supertest';
import app from '../../../src/app';
import { testPrisma } from '../../setup';
import { hashPassword } from '../../../src/utils/password';

describe('Integration Tests: Multi-Tenant Security & Cross-Tenant Access Block', () => {
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAId: string;
  let orgBId: string;
  let orgAProjectId: string;
  let orgATaskId: string;
  let userBId: string;

  beforeAll(async () => {
    // 1. Setup Organization A
    const orgA = await testPrisma.organization.create({ data: { name: 'Tenant Alpha' } });
    orgAId = orgA.id;
    const passHash = await hashPassword('Password123!');
    const userA = await testPrisma.user.create({
      data: { email: 'user.alpha@tenant-a.com', name: 'User Alpha', password_hash: passHash },
    });
    await testPrisma.orgMember.create({
      data: { organization_id: orgA.id, user_id: userA.id, role: 'org_admin' },
    });

    const projectA = await testPrisma.project.create({
      data: { organization_id: orgA.id, name: 'Alpha Secret Project', description: 'Confidential project details' },
    });
    orgAProjectId = projectA.id;

    const taskA = await testPrisma.task.create({
      data: { project_id: projectA.id, title: 'Alpha Secret Task', description: 'Confidential task data' },
    });
    orgATaskId = taskA.id;

    // 2. Setup Organization B
    const orgB = await testPrisma.organization.create({ data: { name: 'Tenant Beta' } });
    orgBId = orgB.id;
    const userB = await testPrisma.user.create({
      data: { email: 'user.beta@tenant-b.com', name: 'User Beta', password_hash: passHash },
    });
    userBId = userB.id;
    await testPrisma.orgMember.create({
      data: { organization_id: orgB.id, user_id: userB.id, role: 'org_admin' },
    });

    // Acquire tokens
    const loginA = await request(app).post('/auth/login').send({ email: 'user.alpha@tenant-a.com', password: 'Password123!' });
    tokenOrgA = loginA.body.data.accessToken;

    const loginB = await request(app).post('/auth/login').send({ email: 'user.beta@tenant-b.com', password: 'Password123!' });
    tokenOrgB = loginB.body.data.accessToken;
  });

  afterAll(async () => {
    await testPrisma.task.deleteMany({ where: { id: orgATaskId } });
    await testPrisma.project.deleteMany({ where: { id: orgAProjectId } });
    await testPrisma.orgMember.deleteMany({ where: { organization_id: { in: [orgAId, orgBId] } } });
    await testPrisma.user.deleteMany({ where: { email: { in: ['user.alpha@tenant-a.com', 'user.beta@tenant-b.com'] } } });
    await testPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  });

  it('GET /projects/:id should return 403 FORBIDDEN when Tenant B user requests Tenant A project', async () => {
    const res = await request(app)
      .get(`/projects/${orgAProjectId}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.data).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Alpha Secret Project');
    expect(JSON.stringify(res.body)).not.toContain('Confidential project details');
  });

  it('GET /tasks/:id should return 403 FORBIDDEN when Tenant B user requests Tenant A task', async () => {
    const res = await request(app)
      .get(`/tasks/${orgATaskId}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.data).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Alpha Secret Task');
  });

  it('POST /tasks/:id/assignments should return 403 FORBIDDEN when Tenant A attempts assigning Tenant B user', async () => {
    const res = await request(app)
      .post(`/tasks/${orgATaskId}/assignments`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ userId: userBId });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /jobs/:id should return 403 FORBIDDEN when Tenant B user queries Tenant A job', async () => {
    const res = await request(app)
      .get('/jobs/job-fake-tenant-a-job-id')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(404); // Job not found or 403
    expect(['FORBIDDEN', 'JOB_NOT_FOUND']).toContain(res.body.code);
  });
});
