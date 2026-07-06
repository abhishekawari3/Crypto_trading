const WebSocket = require('ws');
const { prisma } = require('../config/db');
const { redisPublisher } = require('../config/redis');

const DEFAULT_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'ADAUSDT',
  'DOGEUSDT',
];

// In-memory price registry: Map<symbol, price> for O(1) lookups during trade execution
const priceRegistry = new Map();

let binanceWs = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let activeSymbols = [];

const buildStreamUrl = (symbols) => {
  const streams = symbols
    .map((s) => `${s.toLowerCase()}@trade`)
    .join('/');
  return `${process.env.BINANCE_WS_URL}?streams=${streams}`;
};

const getPrice = (symbol) => priceRegistry.get(symbol.toUpperCase());

const getAllPrices = () => Object.fromEntries(priceRegistry);

const setPrice = async (symbol, price) => {
  priceRegistry.set(symbol, price);

  // Publish to Redis so any backend instance's Socket.IO layer can broadcast it
  try {
    await redisPublisher.publish(
      'price:update',
      JSON.stringify({ symbol, price, timestamp: Date.now() })
    );
  } catch (err) {
    console.error('[PriceFeed] Failed to publish price update:', err.message);
  }
};

const loadActiveSymbols = async () => {
  try {
    const pairs = await prisma.tradingPair.findMany({
      where: { isActive: true },
      select: { symbol: true },
    });

    if (pairs.length === 0) {
      // Seed defaults on first run
      await prisma.tradingPair.createMany({
        data: DEFAULT_SYMBOLS.map((symbol) => ({ symbol, isActive: true })),
        skipDuplicates: true,
      });
      return DEFAULT_SYMBOLS;
    }

    return pairs.map((p) => p.symbol);
  } catch (err) {
    console.error('[PriceFeed] Failed to load active symbols, using defaults:', err.message);
    return DEFAULT_SYMBOLS;
  }
};

const connectBinance = (symbols) => {
  activeSymbols = symbols;

  if (binanceWs) {
    binanceWs.removeAllListeners();
    try {
      binanceWs.terminate();
    } catch (_) {
      /* noop */
    }
  }

  const url = buildStreamUrl(symbols);
  binanceWs = new WebSocket(url);

  binanceWs.on('open', () => {
    console.log(`[PriceFeed] Connected to Binance stream for: ${symbols.join(', ')}`);

    // Heartbeat ping every 30s to keep the connection alive
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (binanceWs.readyState === WebSocket.OPEN) {
        binanceWs.ping();
      }
    }, 30000);
  });

  binanceWs.on('message', (raw) => {
    try {
      const parsed = JSON.parse(raw);
      const payload = parsed.data;
      if (!payload || !payload.s || !payload.p) return;

      const symbol = payload.s; // e.g. BTCUSDT
      const price = parseFloat(payload.p);

      setPrice(symbol, price);
    } catch (err) {
      console.error('[PriceFeed] Failed to parse Binance message:', err.message);
    }
  });

  binanceWs.on('close', () => {
    console.warn('[PriceFeed] Binance WebSocket closed. Reconnecting in 5s...');
    clearInterval(heartbeatInterval);
    scheduleReconnect();
  });

  binanceWs.on('error', (err) => {
    console.error('[PriceFeed] Binance WebSocket error:', err.message);
  });
};

const scheduleReconnect = () => {
  clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    connectBinance(activeSymbols);
  }, 5000);
};

const start = async () => {
  const symbols = await loadActiveSymbols();
  connectBinance(symbols);
};

// Called by admin service when a trading pair is added/removed
const refreshStream = async () => {
  const symbols = await loadActiveSymbols();
  console.log('[PriceFeed] Refreshing stream subscriptions...');
  connectBinance(symbols);
};

const stop = () => {
  clearTimeout(reconnectTimeout);
  clearInterval(heartbeatInterval);
  if (binanceWs) {
    binanceWs.removeAllListeners();
    binanceWs.terminate();
  }
};

module.exports = {
  start,
  stop,
  refreshStream,
  getPrice,
  getAllPrices,
  DEFAULT_SYMBOLS,
};
