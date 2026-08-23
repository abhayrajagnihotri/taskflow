import { Worker, Job } from 'bullmq';
import { redisOptions } from '../../config/redis';
import { EMAIL_QUEUE_NAME, emailDLQ, EmailJobPayload } from '../../queues/email.queue';

export const setupEmailWorker = (): Worker<EmailJobPayload> => {
  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const attemptCount = job.attemptsMade + 1;
      console.log(`⚙️ Processing Job ${job.id} (Attempt ${attemptCount}/4) for Task "${job.data.taskTitle}"`);

      if (job.data.simulateFailure) {
        console.warn(`⚠️ Simulated failure triggered for Job ${job.id} on Attempt ${attemptCount}`);
        throw new Error(`Simulated email service failure on attempt ${attemptCount}`);
      }

      // Mock Email Sender Output
      console.log('📧 [MOCK EMAIL SENT]', {
        type: 'TASK_ASSIGNED_EMAIL',
        to: job.data.assignedUserEmail,
        recipientName: job.data.assignedUserName,
        taskId: job.data.taskId,
        taskTitle: job.data.taskTitle,
        assignedBy: job.data.assignedByUserId,
        timestamp: new Date().toISOString(),
      });

      return {
        sentAt: new Date().toISOString(),
        recipient: job.data.assignedUserEmail,
      };
    },
    {
      connection: redisOptions,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully for task "${job.data.taskTitle}"`);
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts || 4;
    console.error(`❌ Job ${job.id} failed attempt ${job.attemptsMade}/${maxAttempts}. Error: ${err.message}`);

    // When all 3 retries (4 total attempts) are exhausted, move to Dead-Letter Queue (DLQ)
    if (job.attemptsMade >= maxAttempts) {
      console.error(`🚨 Job ${job.id} exhausted all ${maxAttempts} attempts. Moving to Dead-Letter Queue (${emailDLQ.name})`);

      try {
        await emailDLQ.add(
          `dlq-${job.id}`,
          {
            ...job.data,
          },
          {
            jobId: `dlq-${job.id}`,
          }
        );
        console.log(`📥 Job ${job.id} successfully recorded in DLQ (${emailDLQ.name})`);
      } catch (dlqErr: any) {
        console.error(`❌ Failed to push Job ${job.id} to DLQ:`, dlqErr.message);
      }
    }
  });

  return worker;
};
