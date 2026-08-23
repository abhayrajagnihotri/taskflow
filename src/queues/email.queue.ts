import { Queue } from 'bullmq';
import { redisOptions } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-notifications';
export const EMAIL_DLQ_NAME = 'email-notifications-dlq';

export interface EmailJobPayload {
  taskId: string;
  taskTitle: string;
  assignedUserId: string;
  assignedUserEmail: string;
  assignedUserName: string;
  assignedByUserId: string;
  organizationId: string;
  simulateFailure?: boolean;
}

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 4, // 1 initial attempt + 3 retries = 4 total attempts
    backoff: {
      type: 'exponential',
      delay: 1000, // Retry #1: 1s, Retry #2: 2s, Retry #3: 4s
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const emailDLQ = new Queue<EmailJobPayload>(EMAIL_DLQ_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});
