import request from 'supertest';
import app from '../../../src/app';
import { testPrisma } from '../../setup';
import { hashPassword } from '../../../src/utils/password';

describe('Integration Tests: Organization Member Management (/organizations/members)', () => {
  let adminToken: string;
  let memberToken: string;
  let tenantBToken: string;
  let orgId: string;
  let tenantBOrgId: string;
  let addedUserId: string;

  beforeAll(async () => {
    // Setup Primary Org
    const org = await testPrisma.organization.create({ data: { name: 'Member Test Org' } });
    orgId = org.id;

    const passHash = await hashPassword('Password123!');
    const adminUser = await testPrisma.user.create({
      data: { email: 'member.admin@example.com', name: 'Member Admin', password_hash: passHash },
    });

    const memberUser = await testPrisma.user.create({
      data: { email: 'member.user@example.com', name: 'Member User', password_hash: passHash },
    });

    await testPrisma.orgMember.createMany({
      data: [
        { organization_id: org.id, user_id: adminUser.id, role: 'org_admin' },
        { organization_id: org.id, user_id: memberUser.id, role: 'member' },
      ],
    });

    // Setup Tenant B Org for Security Check
    const tenantBOrg = await testPrisma.organization.create({ data: { name: 'Tenant B Member Org' } });
    tenantBOrgId = tenantBOrg.id;

    const tenantBUser = await testPrisma.user.create({
      data: { email: 'tenantb.user@example.com', name: 'Tenant B User', password_hash: passHash },
    });

    await testPrisma.orgMember.create({
      data: { organization_id: tenantBOrg.id, user_id: tenantBUser.id, role: 'org_admin' },
    });

    // Acquire tokens
    const adminLogin = await request(app).post('/auth/login').send({ email: 'member.admin@example.com', password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    const memberLogin = await request(app).post('/auth/login').send({ email: 'member.user@example.com', password: 'Password123!' });
    memberToken = memberLogin.body.data.accessToken;

    const tenantBLogin = await request(app).post('/auth/login').send({ email: 'tenantb.user@example.com', password: 'Password123!' });
    tenantBToken = tenantBLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await testPrisma.orgMember.deleteMany({ where: { organization_id: { in: [orgId, tenantBOrgId] } } });
    await testPrisma.user.deleteMany({
      where: {
        email: { in: ['member.admin@example.com', 'member.user@example.com', 'tenantb.user@example.com', 'new.addedmember@example.com'] },
      },
    });
    await testPrisma.organization.deleteMany({ where: { id: { in: [orgId, tenantBOrgId] } } });
  });

  it('GET /organizations/members should list organization members', async () => {
    const res = await request(app)
      .get('/organizations/members')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].user.password_hash).toBeUndefined();
  });

  it('POST /organizations/members as org_admin should add a new member to organization', async () => {
    const res = await request(app)
      .post('/organizations/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new.addedmember@example.com',
        name: 'New Member',
        role: 'member',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('new.addedmember@example.com');
    expect(res.body.data.role).toBe('member');
    addedUserId = res.body.data.user_id;
  });

  it('POST /organizations/members as member role should be blocked with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/organizations/members')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        email: 'unauthorized.add@example.com',
        role: 'member',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('PATCH /organizations/members/:userId as org_admin should update member role', async () => {
    const res = await request(app)
      .patch(`/organizations/members/${addedUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'org_admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('org_admin');
  });

  it('DELETE /organizations/members/:userId as org_admin should remove member from organization', async () => {
    const res = await request(app)
      .delete(`/organizations/members/${addedUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Member removed from organization successfully');
  });

  it('GET /organizations/members/:userId from Tenant B should return 404 MEMBER_NOT_FOUND', async () => {
    const res = await request(app)
      .get(`/organizations/members/${addedUserId}`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('MEMBER_NOT_FOUND');
  });
});
