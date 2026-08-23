import { PrismaClient, Role, Status, Priority } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://taskflow:taskflow_password@localhost:5432/taskflow';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Password hash with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 1. Seed Users (5 users)
  const user1 = await prisma.user.upsert({
    where: { email: 'admin.alpha@example.com' },
    update: {},
    create: {
      name: 'Alice Alpha',
      email: 'admin.alpha@example.com',
      password_hash: passwordHash,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'dev1.alpha@example.com' },
    update: {},
    create: {
      name: 'Bob Alpha',
      email: 'dev1.alpha@example.com',
      password_hash: passwordHash,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'dev2.alpha@example.com' },
    update: {},
    create: {
      name: 'Charlie Alpha',
      email: 'dev2.alpha@example.com',
      password_hash: passwordHash,
    },
  });

  const user4 = await prisma.user.upsert({
    where: { email: 'admin.beta@example.com' },
    update: {},
    create: {
      name: 'David Beta',
      email: 'admin.beta@example.com',
      password_hash: passwordHash,
    },
  });

  const user5 = await prisma.user.upsert({
    where: { email: 'dev.beta@example.com' },
    update: {},
    create: {
      name: 'Eve Beta',
      email: 'dev.beta@example.com',
      password_hash: passwordHash,
    },
  });

  console.log('✅ Users seeded');

  // 2. Seed Organizations (2 orgs)
  let orgA = await prisma.organization.findFirst({
    where: { name: 'Alpha Tech Corp' },
  });
  if (!orgA) {
    orgA = await prisma.organization.create({
      data: { name: 'Alpha Tech Corp' },
    });
  }

  let orgB = await prisma.organization.findFirst({
    where: { name: 'Beta Solutions Ltd' },
  });
  if (!orgB) {
    orgB = await prisma.organization.create({
      data: { name: 'Beta Solutions Ltd' },
    });
  }

  console.log('✅ Organizations seeded');

  // 3. Seed Org Memberships
  await prisma.orgMember.upsert({
    where: {
      organization_id_user_id: { organization_id: orgA.id, user_id: user1.id },
    },
    update: { role: Role.org_admin },
    create: { organization_id: orgA.id, user_id: user1.id, role: Role.org_admin },
  });

  await prisma.orgMember.upsert({
    where: {
      organization_id_user_id: { organization_id: orgA.id, user_id: user2.id },
    },
    update: { role: Role.member },
    create: { organization_id: orgA.id, user_id: user2.id, role: Role.member },
  });

  await prisma.orgMember.upsert({
    where: {
      organization_id_user_id: { organization_id: orgA.id, user_id: user3.id },
    },
    update: { role: Role.member },
    create: { organization_id: orgA.id, user_id: user3.id, role: Role.member },
  });

  await prisma.orgMember.upsert({
    where: {
      organization_id_user_id: { organization_id: orgB.id, user_id: user4.id },
    },
    update: { role: Role.org_admin },
    create: { organization_id: orgB.id, user_id: user4.id, role: Role.org_admin },
  });

  await prisma.orgMember.upsert({
    where: {
      organization_id_user_id: { organization_id: orgB.id, user_id: user5.id },
    },
    update: { role: Role.member },
    create: { organization_id: orgB.id, user_id: user5.id, role: Role.member },
  });

  console.log('✅ Org Members seeded');

  // 4. Seed Projects (2 for Org A, 1 for Org B)
  let projA1 = await prisma.project.findFirst({
    where: { organization_id: orgA.id, name: 'TaskFlow Core Backend' },
  });
  if (!projA1) {
    projA1 = await prisma.project.create({
      data: {
        organization_id: orgA.id,
        name: 'TaskFlow Core Backend',
        description: 'Primary REST API backend engine for TaskFlow.',
      },
    });
  }

  let projA2 = await prisma.project.findFirst({
    where: { organization_id: orgA.id, name: 'Analytics Dashboard' },
  });
  if (!projA2) {
    projA2 = await prisma.project.create({
      data: {
        organization_id: orgA.id,
        name: 'Analytics Dashboard',
        description: 'Internal metrics and usage monitoring dashboard.',
      },
    });
  }

  let projB1 = await prisma.project.findFirst({
    where: { organization_id: orgB.id, name: 'Client Portal Mobile' },
  });
  if (!projB1) {
    projB1 = await prisma.project.create({
      data: {
        organization_id: orgB.id,
        name: 'Client Portal Mobile',
        description: 'Mobile interface for Beta Solutions client interaction.',
      },
    });
  }

  console.log('✅ Projects seeded');

  // 5. Seed Tasks (12 tasks distributed across projects)
  const taskData = [
    // Project A1 Tasks
    {
      project_id: projA1.id,
      title: 'Design Database Schema',
      description: 'Define models, indexes, and FK constraints in Prisma.',
      status: Status.done,
      priority: Priority.urgent,
      due_date: new Date('2026-09-01'),
    },
    {
      project_id: projA1.id,
      title: 'Implement JWT Auth Service',
      description: 'Setup token generation, validation, and refresh logic.',
      status: Status.in_progress,
      priority: Priority.high,
      due_date: new Date('2026-09-05'),
    },
    {
      project_id: projA1.id,
      title: 'Setup BullMQ Queue Worker',
      description: 'Configure Redis connection and background job worker.',
      status: Status.todo,
      priority: Priority.medium,
      due_date: new Date('2026-09-10'),
    },
    {
      project_id: projA1.id,
      title: 'Write Integration Tests',
      description: 'Implement API test suite using Jest and Supertest.',
      status: Status.todo,
      priority: Priority.high,
      due_date: new Date('2026-09-15'),
    },
    {
      project_id: projA1.id,
      title: 'Swagger API Documentation',
      description: 'Generate OpenAPI / Swagger documentation endpoints.',
      status: Status.review,
      priority: Priority.low,
      due_date: new Date('2026-09-20'),
    },

    // Project A2 Tasks
    {
      project_id: projA2.id,
      title: 'Build Event Ingestion Pipeline',
      description: 'Stream metrics data into timeseries database.',
      status: Status.in_progress,
      priority: Priority.urgent,
      due_date: new Date('2026-09-08'),
    },
    {
      project_id: projA2.id,
      title: 'Design Reporting UI Widgets',
      description: 'Create reusable chart components for analytics.',
      status: Status.todo,
      priority: Priority.medium,
      due_date: new Date('2026-09-18'),
    },
    {
      project_id: projA2.id,
      title: 'Optimize Aggregation Queries',
      description: 'Improve SQL query execution speed on dashboard stats.',
      status: Status.review,
      priority: Priority.high,
      due_date: new Date('2026-09-22'),
    },

    // Project B1 Tasks
    {
      project_id: projB1.id,
      title: 'Mobile App Wireframing',
      description: 'Draft user experience screens for iOS and Android apps.',
      status: Status.done,
      priority: Priority.high,
      due_date: new Date('2026-08-30'),
    },
    {
      project_id: projB1.id,
      title: 'Push Notification Integration',
      description: 'Integrate FCM for client alerts.',
      status: Status.in_progress,
      priority: Priority.urgent,
      due_date: new Date('2026-09-12'),
    },
    {
      project_id: projB1.id,
      title: 'Client OAuth SSO Login',
      description: 'Enable Google and GitHub OAuth login for clients.',
      status: Status.todo,
      priority: Priority.medium,
      due_date: new Date('2026-09-25'),
    },
    {
      project_id: projB1.id,
      title: 'Security Audit & Compliance',
      description: 'Perform penetration testing and audit user access controls.',
      status: Status.todo,
      priority: Priority.urgent,
      due_date: new Date('2026-09-30'),
    },
  ];

  const tasks = [];
  for (const t of taskData) {
    let task = await prisma.task.findFirst({
      where: { project_id: t.project_id, title: t.title },
    });
    if (!task) {
      task = await prisma.task.create({ data: t });
    }
    tasks.push(task);
  }

  console.log('✅ Tasks seeded (12 tasks total)');

  // 6. Seed Task Assignments
  await prisma.taskAssignment.upsert({
    where: { task_id_user_id: { task_id: tasks[0].id, user_id: user1.id } },
    update: {},
    create: { task_id: tasks[0].id, user_id: user1.id },
  });
  await prisma.taskAssignment.upsert({
    where: { task_id_user_id: { task_id: tasks[0].id, user_id: user2.id } },
    update: {},
    create: { task_id: tasks[0].id, user_id: user2.id },
  });

  await prisma.taskAssignment.upsert({
    where: { task_id_user_id: { task_id: tasks[1].id, user_id: user2.id } },
    update: {},
    create: { task_id: tasks[1].id, user_id: user2.id },
  });

  await prisma.taskAssignment.upsert({
    where: { task_id_user_id: { task_id: tasks[5].id, user_id: user3.id } },
    update: {},
    create: { task_id: tasks[5].id, user_id: user3.id },
  });

  await prisma.taskAssignment.upsert({
    where: { task_id_user_id: { task_id: tasks[8].id, user_id: user4.id } },
    update: {},
    create: { task_id: tasks[8].id, user_id: user4.id },
  });
  await prisma.taskAssignment.upsert({
    where: { task_id_user_id: { task_id: tasks[8].id, user_id: user5.id } },
    update: {},
    create: { task_id: tasks[8].id, user_id: user5.id },
  });

  console.log('✅ Task Assignments seeded');

  // 7. Seed Comments
  const commentCount = await prisma.comment.count();
  if (commentCount === 0) {
    await prisma.comment.createMany({
      data: [
        {
          task_id: tasks[0].id,
          user_id: user1.id,
          content: 'Database schema draft completed and verified in PostgreSQL.',
        },
        {
          task_id: tasks[0].id,
          user_id: user2.id,
          content: 'Great work! Cascades and indexes look solid.',
        },
        {
          task_id: tasks[1].id,
          user_id: user2.id,
          content: 'Starting implementation of JWT token generation.',
        },
        {
          task_id: tasks[8].id,
          user_id: user4.id,
          content: 'Wireframes reviewed by stakeholder group.',
        },
      ],
    });
  }

  console.log('✅ Comments seeded');
  console.log('🚀 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
