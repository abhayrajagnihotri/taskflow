import { prisma } from '../src/lib/prisma';
import { redisConnection } from '../src/config/redis';
import { emailQueue, emailDLQ } from '../src/queues/email.queue';

const TEST_DB_URL = process.env.DATABASE_URL_TEST || 'postgresql://taskflow:taskflow_password@localhost:5432/taskflow_test';

// Enforce test database isolation override
process.env.DATABASE_URL = TEST_DB_URL;

if (!TEST_DB_URL.includes('taskflow_test')) {
  throw new Error(`CRITICAL TEST SAFETY ERROR: Test database URL must contain "taskflow_test". Received: ${TEST_DB_URL}`);
}

export const testPrisma = prisma;

beforeAll(async () => {
  if (!TEST_DB_URL.includes('taskflow_test')) {
    throw new Error('SAFETY CHECK FAILED: Attempted to run tests against non-test database!');
  }
});

afterAll(async () => {
  try {
    await emailQueue.close();
    await emailDLQ.close();
    await redisConnection.quit();
  } catch (e) {
    // Ignore cleanup errors
  }
  await testPrisma.$disconnect();
});
