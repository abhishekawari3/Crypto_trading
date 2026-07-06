const Redis = require('ioredis');

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
};

// Three separate connections:
// - redisClient: general cache reads/writes
// - redisPublisher: publishes price updates
// - redisSubscriber: subscribes to price channel (a connection in SUBSCRIBE mode
//   cannot run other commands, so it must be isolated)
const redisClient = new Redis(redisOptions);
const redisPublisher = new Redis(redisOptions);
const redisSubscriber = new Redis(redisOptions);

let isReady = false;

const connectRedis = async () => {
  return new Promise((resolve, reject) => {
    let connected = 0;
    const clients = [redisClient, redisPublisher, redisSubscriber];
    const names = ['client', 'publisher', 'subscriber'];
    const timeoutMs = parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000;

    const checkClientReady = (client, name) => {
      if (client.status === 'ready') {
        console.log(`[Redis] ${name} already ready`);
        connected += 1;
        if (connected === clients.length) {
          isReady = true;
          resolve();
        }
        return true;
      }
      return false;
    };

    clients.forEach((client, i) => {
      const name = names[i];

      if (checkClientReady(client, name)) {
        return;
      }

      client.once('ready', () => {
        console.log(`[Redis] ${name} ready`);
        connected += 1;
        if (connected === clients.length) {
          isReady = true;
          resolve();
        }
      });

      client.once('error', (err) => {
        console.error(`[Redis] ${name} error:`, err.message);
      });
    });

    // Fail fast if redis is completely unreachable
    setTimeout(() => {
      if (!isReady) {
        reject(new Error(`Redis connection timed out after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);
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
