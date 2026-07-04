const Redis = require('ioredis');

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
};

const redisClient = new Redis(redisOptions);
const redisPublisher = new Redis(redisOptions);
const redisSubscriber = new Redis(redisOptions);

let isReady = false;

const connectRedis = async () => {
  return new Promise((resolve, reject) => {
    let connected = 0;
    const clients = [redisClient, redisPublisher, redisSubscriber];
    const names = ['client', 'publisher', 'subscriber'];

    clients.forEach((client, i) => {
      client.on('connect', () => {
        console.log(`[Redis] ${names[i]} connected`);
        connected += 1;
        if (connected === clients.length) {
          isReady = true;
          resolve();
        }
      });

      client.on('error', (err) => {
        console.error(`[Redis] ${names[i]} error:`, err.message);
      });
    });

    // Fail fast if redis is completely unreachable
    setTimeout(() => {
      if (!isReady) {
        reject(new Error('Redis connection timed out after 10s'));
      }
    }, 10000);
  });
};

const isRedisReady = () => isReady;

module.exports = {
  redisClient,
  redisPublisher,
  redisSubscriber,
  connectRedis,
  isRedisReady,
};
