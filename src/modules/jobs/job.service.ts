import { emailQueue, emailDLQ, EmailJobPayload } from '../../queues/email.queue';
import { JobNotFoundError, ForbiddenError } from '../../utils/errors';

export interface NormalizedJobResponse {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  metadata: {
    taskId: string;
    taskTitle: string;
    assignedUserId: string;
    assignedUserEmail: string;
    assignedByUserId: string;
    attemptsMade: number;
    failedReason: string | null;
    timestamp: number;
  };
}

export class JobService {
  async getJobById(orgId: string, jobId: string): Promise<NormalizedJobResponse> {
    // 1. Search main email queue
    let job = await emailQueue.getJob(jobId);
    let isDLQ = false;

    // 2. If not in main queue, search dead-letter queue (DLQ)
    if (!job) {
      const dlqId = jobId.startsWith('dlq-') ? jobId : `dlq-${jobId}`;
      job = await emailDLQ.getJob(dlqId);
      if (!job) {
        // Try searching without prefix if needed
        job = await emailDLQ.getJob(jobId);
      }
      if (job) {
        isDLQ = true;
      }
    }

    if (!job) {
      throw new JobNotFoundError();
    }

    // 3. Verify Organization Ownership Security Rule
    if (job.data && job.data.organizationId && job.data.organizationId !== orgId) {
      throw new ForbiddenError();
    }

    // 4. Normalize BullMQ state into 4 required statuses: pending, active, completed, failed
    let normalizedStatus: 'pending' | 'active' | 'completed' | 'failed' = 'pending';

    if (isDLQ) {
      normalizedStatus = 'failed';
    } else {
      const state = await job.getState();
      switch (state) {
        case 'waiting':
        case 'delayed':
        case 'prioritized':
        case 'waiting-children':
          normalizedStatus = 'pending';
          break;
        case 'active':
          normalizedStatus = 'active';
          break;
        case 'completed':
          normalizedStatus = 'completed';
          break;
        case 'failed':
          normalizedStatus = 'failed';
          break;
        default:
          normalizedStatus = 'pending';
      }
    }

    return {
      id: String(job.id),
      status: normalizedStatus,
      metadata: {
        taskId: job.data.taskId,
        taskTitle: job.data.taskTitle,
        assignedUserId: job.data.assignedUserId,
        assignedUserEmail: job.data.assignedUserEmail,
        assignedByUserId: job.data.assignedByUserId,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason || null,
        timestamp: job.timestamp,
      },
    };
  }
}

export const jobService = new JobService();
