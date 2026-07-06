require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initializeSocket, subscribeToPriceUpdates } = require('./config/socket');
const priceFeedService = require('./services/priceFeedService');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    const httpServer = http.createServer(app);

    // initializeSocket() must run before any route/service calls getIO()
    initializeSocket(httpServer);
    subscribeToPriceUpdates();

    // Begin streaming live prices from Binance
    await priceFeedService.start();

    httpServer.listen(PORT, () => {
      console.log(`[Server] Crypto Trading Simulator running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      priceFeedService.stop();
      httpServer.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
};

start();
