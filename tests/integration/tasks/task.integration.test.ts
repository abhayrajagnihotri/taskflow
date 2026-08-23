import request from 'supertest';
import app from '../../../src/app';
import { testPrisma } from '../../setup';
import { hashPassword } from '../../../src/utils/password';

describe('Integration Tests: Task CRUD & Filtering (/projects/:projectId/tasks & /tasks)', () => {
  let userToken: string;
  let orgId: string;
  let projectId: string;
  let createdTaskId: string;

  beforeAll(async () => {
    const org = await testPrisma.organization.create({ data: { name: 'Task Integration Org' } });
    orgId = org.id;

    const passHash = await hashPassword('Password123!');
    const user = await testPrisma.user.create({
      data: { email: 'task.user@example.com', name: 'Task User', password_hash: passHash },
    });

    await testPrisma.orgMember.create({
      data: { organization_id: org.id, user_id: user.id, role: 'member' },
    });

    const project = await testPrisma.project.create({
      data: { organization_id: org.id, name: 'Task Test Project' },
    });
    projectId = project.id;

    const loginRes = await request(app).post('/auth/login').send({ email: 'task.user@example.com', password: 'Password123!' });
    userToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await testPrisma.task.deleteMany({ where: { project_id: projectId } });
    await testPrisma.project.deleteMany({ where: { id: projectId } });
    await testPrisma.orgMember.deleteMany({ where: { organization_id: orgId } });
    await testPrisma.user.deleteMany({ where: { email: 'task.user@example.com' } });
    await testPrisma.organization.deleteMany({ where: { id: orgId } });
  });

  it('POST /projects/:projectId/tasks should create a task', async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Task Integration Title',
        status: 'todo',
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.title).toBe('Task Integration Title');
    createdTaskId = res.body.data.id;
  });

  it('GET /projects/:projectId/tasks should list tasks with filters', async () => {
    const res = await request(app)
      .get(`/projects/${projectId}/tasks?status=todo&priority=high&page=1&limit=10`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /tasks/:id should fetch single task details', async () => {
    const res = await request(app)
      .get(`/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdTaskId);
  });

  it('PATCH /tasks/:id should update task status', async () => {
    const res = await request(app)
      .patch(`/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('DELETE /tasks/:id should delete task', async () => {
    const res = await request(app)
      .delete(`/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted successfully');
  });
});
