const Decimal = require('decimal.js');
const { prisma } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');
const priceFeedService = require('./priceFeedService');
const { redisClient } = require('../config/redis');
const { getIO } = require('../config/socket');

Decimal.set({ precision: 28, rounding: Decimal.ROUND_DOWN });

const LEADERBOARD_CACHE_KEY = 'leaderboard:top';

const invalidateLeaderboardCache = async () => {
  try {
    await redisClient.del(LEADERBOARD_CACHE_KEY);
  } catch (err) {
    console.error('[TradeService] Failed to invalidate leaderboard cache:', err.message);
  }
};

const emitSafely = (event, room, payload) => {
  try {
    getIO().to(room).emit(event, payload);
  } catch (err) {
    // Socket.IO may not be initialized in test contexts; don't crash the trade
    console.warn(`[TradeService] Could not emit ${event}:`, err.message);
  }
};

/**
 * Execute a BUY order.
 * Flow: fetch price -> compute cost -> transaction (deduct balance,
 * upsert holding with weighted avg price, create trade record) -> broadcast.
 */
const buy = async (userId, { symbol, quantity }) => {
  const price = priceFeedService.getPrice(symbol);
  if (price === undefined) {
    throw new AppError(`No price data available for ${symbol}`, 400);
  }

  const priceDec = new Decimal(price);
  const qtyDec = new Decimal(quantity);
  const totalCost = priceDec.times(qtyDec);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const balanceDec = new Decimal(user.virtualBalance.toString());
    if (balanceDec.lessThan(totalCost)) {
      throw new AppError('Insufficient balance', 400);
    }

    const newBalance = balanceDec.minus(totalCost).toFixed(8);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { virtualBalance: newBalance },
    });

    const existingHolding = await tx.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });

    let holding;
    if (existingHolding) {
      const existingQty = new Decimal(existingHolding.quantity.toString());
      const existingAvg = new Decimal(existingHolding.avgBuyPrice.toString());
      const existingCost = existingQty.times(existingAvg);

      const newQty = existingQty.plus(qtyDec);
      const newAvgPrice = existingCost.plus(totalCost).dividedBy(newQty);

      holding = await tx.holding.update({
        where: { userId_symbol: { userId, symbol } },
        data: {
          quantity: newQty.toFixed(8),
          avgBuyPrice: newAvgPrice.toFixed(8),
        },
      });
    } else {
      holding = await tx.holding.create({
        data: {
          userId,
          symbol,
          quantity: qtyDec.toFixed(8),
          avgBuyPrice: priceDec.toFixed(8),
        },
      });
    }

    const trade = await tx.trade.create({
      data: {
        userId,
        symbol,
        tradeType: 'BUY',
        quantity: qtyDec.toFixed(8),
        price: priceDec.toFixed(8),
        totalValue: totalCost.toFixed(8),
      },
    });

    return { user: updatedUser, holding, trade };
  });

  await invalidateLeaderboardCache();

  emitSafely('trade:confirmation', `user:${userId}`, result.trade);
  emitSafely('portfolio:update', `user:${userId}`, {
    virtualBalance: result.user.virtualBalance,
    timestamp: Date.now(),
  });

  return result.trade;
};

/**
 * Execute a SELL order.
 * Flow: fetch price -> compute proceeds -> transaction (validate holding,
 * reduce/delete holding, credit balance, create trade record) -> broadcast.
 */
const sell = async (userId, { symbol, quantity }) => {
  const price = priceFeedService.getPrice(symbol);
  if (price === undefined) {
    throw new AppError(`No price data available for ${symbol}`, 400);
  }

  const priceDec = new Decimal(price);
  const qtyDec = new Decimal(quantity);
  const totalValue = priceDec.times(qtyDec);

  const result = await prisma.$transaction(async (tx) => {
    const holding = await tx.holding.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });

    if (!holding) {
      throw new AppError(`No holdings found for ${symbol}`, 400);
    }

    const heldQty = new Decimal(holding.quantity.toString());
    if (heldQty.lessThan(qtyDec)) {
      throw new AppError('Insufficient holdings', 400);
    }

    const remainingQty = heldQty.minus(qtyDec);

    if (remainingQty.isZero()) {
      await tx.holding.delete({ where: { userId_symbol: { userId, symbol } } });
    } else {
      await tx.holding.update({
        where: { userId_symbol: { userId, symbol } },
        data: { quantity: remainingQty.toFixed(8) },
      });
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    const newBalance = new Decimal(user.virtualBalance.toString())
      .plus(totalValue)
      .toFixed(8);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { virtualBalance: newBalance },
    });

    const trade = await tx.trade.create({
      data: {
        userId,
        symbol,
        tradeType: 'SELL',
        quantity: qtyDec.toFixed(8),
        price: priceDec.toFixed(8),
        totalValue: totalValue.toFixed(8),
      },
    });

    return { user: updatedUser, trade };
  });

  await invalidateLeaderboardCache();

  emitSafely('trade:confirmation', `user:${userId}`, result.trade);
  emitSafely('portfolio:update', `user:${userId}`, {
    virtualBalance: result.user.virtualBalance,
    timestamp: Date.now(),
  });

  return result.trade;
};

const getHistory = async (userId, filters) => {
  const { page, limit, symbol, type, startDate, endDate } = filters;

  const where = { userId };
  if (symbol) where.symbol = symbol;
  if (type) where.tradeType = type;
  if (startDate || endDate) {
    where.executedAt = {};
    if (startDate) where.executedAt.gte = new Date(startDate);
    if (endDate) where.executedAt.lte = new Date(endDate);
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trade.count({ where }),
  ]);

  return {
    trades,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = { buy, sell, getHistory };
