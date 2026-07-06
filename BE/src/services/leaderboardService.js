const Decimal = require('decimal.js');
const { prisma } = require('../config/db');
const { redisClient } = require('../config/redis');
const priceFeedService = require('./priceFeedService');

const CACHE_KEY = 'leaderboard:top';
const CACHE_TTL = parseInt(process.env.LEADERBOARD_CACHE_TTL, 10) || 30;

const computeLeaderboard = async (limit) => {
  const users = await prisma.user.findMany({
    include: { holdings: true },
  });

  const ranked = users.map((user) => {
    const cash = new Decimal(user.virtualBalance.toString());
    const holdingsValue = user.holdings.reduce((sum, h) => {
      const price = priceFeedService.getPrice(h.symbol);
      if (price === undefined) return sum;
      return sum.plus(new Decimal(h.quantity.toString()).times(price));
    }, new Decimal(0));

    const portfolioValue = cash.plus(holdingsValue);
    const initialBalance = new Decimal(user.initialBalance.toString());
    const pnl = portfolioValue.minus(initialBalance);
    const pnlPercent = initialBalance.isZero()
      ? new Decimal(0)
      : pnl.dividedBy(initialBalance).times(100);

    return {
      userId: user.id,
      email: user.email,
      portfolioValue: portfolioValue.toFixed(8),
      pnl: pnl.toFixed(8),
      pnlPercent: pnlPercent.toFixed(2),
    };
  });

  ranked.sort((a, b) => new Decimal(b.portfolioValue).cmp(new Decimal(a.portfolioValue)));

  return ranked.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));
};

const getLeaderboard = async (limit = 20) => {
  try {
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { data: parsed.slice(0, limit), cached: true };
    }
  } catch (err) {
    console.error('[Leaderboard] Redis read failed, falling back to DB:', err.message);
  }

  const fresh = await computeLeaderboard(Math.max(limit, 100)); // cache a larger slice

  try {
    await redisClient.set(CACHE_KEY, JSON.stringify(fresh), 'EX', CACHE_TTL);
  } catch (err) {
    console.error('[Leaderboard] Failed to cache leaderboard:', err.message);
  }

  return { data: fresh.slice(0, limit), cached: false };
};

module.exports = { getLeaderboard };
