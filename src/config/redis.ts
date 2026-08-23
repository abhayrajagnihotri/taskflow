import Redis from 'ioredis';
import { env } from './env';

export const redisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
};

export const redisConnection = new Redis(redisOptions);

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

redisConnection.on('connect', () => {
  console.log(`🔌 Connected to Redis server at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});
