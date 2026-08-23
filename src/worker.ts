import { setupEmailWorker } from './modules/notifications/email.worker';
import { env } from './config/env';

console.log(`🚀 Starting TaskFlow Email Worker process in ${env.NODE_ENV} mode...`);

const worker = setupEmailWorker();

const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down worker gracefully...`);
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
