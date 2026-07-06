const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { neonConfig } = require('@neondatabase/serverless');
const WebSocket = require('ws');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Singleton PrismaClient to avoid exhausting DB connections in dev (nodemon reloads)
const globalForPrisma = globalThis;

const isNeonDatabase = (() => {
  try {
    return new URL(databaseUrl).hostname.endsWith('.neon.tech');
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL');
  }
})();

const clientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
};

if (isNeonDatabase) {
  // Neon's serverless adapter avoids native TLS issues on Windows and uses
  // the provider's supported pooled transport.
  neonConfig.webSocketConstructor = WebSocket;
  clientOptions.adapter = new PrismaNeon({ connectionString: databaseUrl });
} else {
  clientOptions.datasources = { db: { url: databaseUrl } };
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(clientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

module.exports = { prisma, connectDB, disconnectDB };
