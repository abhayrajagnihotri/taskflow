import request from 'supertest';
import app from '../../../src/app';
import { testPrisma } from '../../setup';
import { hashPassword } from '../../../src/utils/password';

describe('Integration Tests: Task Assignment & Queueing (/tasks/:id/assignments)', () => {
  let userToken: string;
  let orgId: string;
  let projectId: string;
  let taskId: string;
  let memberUserId: string;

  beforeAll(async () => {
    const org = await testPrisma.organization.create({ data: { name: 'Assignment Integration Org' } });
    orgId = org.id;

    const passHash = await hashPassword('Password123!');
    const admin = await testPrisma.user.create({
      data: { email: 'assign.admin@example.com', name: 'Assign Admin', password_hash: passHash },
    });

    const member = await testPrisma.user.create({
      data: { email: 'assign.member@example.com', name: 'Assign Member', password_hash: passHash },
    });
    memberUserId = member.id;

    await testPrisma.orgMember.createMany({
      data: [
        { organization_id: org.id, user_id: admin.id, role: 'org_admin' },
        { organization_id: org.id, user_id: member.id, role: 'member' },
      ],
    });

    const project = await testPrisma.project.create({
      data: { organization_id: org.id, name: 'Assignment Test Project' },
    });
    projectId = project.id;

    const task = await testPrisma.task.create({
      data: { project_id: project.id, title: 'Assignment Test Task' },
    });
    taskId = task.id;

    const loginRes = await request(app).post('/auth/login').send({ email: 'assign.admin@example.com', password: 'Password123!' });
    userToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await testPrisma.taskAssignment.deleteMany({ where: { task_id: taskId } });
    await testPrisma.task.deleteMany({ where: { id: taskId } });
    await testPrisma.project.deleteMany({ where: { id: projectId } });
    await testPrisma.orgMember.deleteMany({ where: { organization_id: orgId } });
    await testPrisma.user.deleteMany({ where: { email: { in: ['assign.admin@example.com', 'assign.member@example.com'] } } });
    await testPrisma.organization.deleteMany({ where: { id: orgId } });
  });

  it('POST /tasks/:id/assignments should create assignment and return jobId', async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/assignments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: memberUserId });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User assigned to task successfully');
    expect(res.body.data?.jobId).toBeDefined();
  });

  it('POST /tasks/:id/assignments should return 409 DUPLICATE_ASSIGNMENT on duplicate request', async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/assignments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: memberUserId });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_ASSIGNMENT');
  });
});
