const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { redisSubscriber } = require('./redis');

let io = null;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware - verifies JWT on connection handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.userId})`);

    // Join personal room for targeted notifications
    socket.join(`user:${socket.userId}`);

    socket.emit('connected', {
      message: 'Connected to real-time feed',
      userId: socket.userId,
    });

    socket.on('subscribe:symbol', (symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      const room = `prices:${symbol.toUpperCase()}`;
      socket.join(room);
      console.log(`[Socket] ${socket.id} subscribed to ${room}`);
    });

    socket.on('unsubscribe:symbol', (symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      const room = `prices:${symbol.toUpperCase()}`;
      socket.leave(room);
      console.log(`[Socket] ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket() first.');
  }
  return io;
};

// Bridges Redis Pub/Sub (published by priceFeedService) into Socket.IO rooms.
// This decoupling lets multiple backend instances share one price feed and
// still broadcast consistently to all connected clients (horizontal scaling).
const subscribeToPriceUpdates = () => {
  redisSubscriber.subscribe('price:update', (err) => {
    if (err) {
      console.error('[Socket] Failed to subscribe to price:update channel:', err.message);
      return;
    }
    console.log('[Socket] Subscribed to Redis price:update channel');
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel !== 'price:update') return;
    try {
      const data = JSON.parse(message);
      getIO()
        .to(`prices:${data.symbol}`)
        .emit('price:update', data);
    } catch (err) {
      console.error('[Socket] Failed to process price update message:', err.message);
    }
  });
};

module.exports = { initializeSocket, getIO, subscribeToPriceUpdates };
