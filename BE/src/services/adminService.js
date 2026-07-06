const { prisma } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');
const priceFeedService = require('./priceFeedService');

const INITIAL_BALANCE = parseFloat(process.env.INITIAL_VIRTUAL_BALANCE) || 10000;

const addTradingPair = async (symbolRaw) => {
  const symbol = symbolRaw.toUpperCase();

  try {
    const pair = await prisma.tradingPair.create({
      data: { symbol, isActive: true },
    });
    await priceFeedService.refreshStream();
    return pair;
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(`${symbol} already exists`, 409);
    }
    throw err;
  }
};

const removeTradingPair = async (symbolRaw) => {
  const symbol = symbolRaw.toUpperCase();

  const pair = await prisma.tradingPair.findUnique({ where: { symbol } });
  if (!pair) {
    throw new AppError(`${symbol} not found`, 404);
  }

  await prisma.tradingPair.update({
    where: { symbol },
    data: { isActive: false },
  });

  await priceFeedService.refreshStream();

  return { symbol, isActive: false };
};

const resetUserPortfolio = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await prisma.$transaction([
    prisma.holding.deleteMany({ where: { userId } }),
    prisma.trade.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        virtualBalance: INITIAL_BALANCE,
        initialBalance: INITIAL_BALANCE,
      },
    }),
  ]);

  return { message: 'Portfolio reset successfully', userId };
};

const getPlatformStats = async (getConnectionCount) => {
  const [userCount, tradeCount, tradeAgg, activePairs] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count(),
    prisma.trade.aggregate({ _sum: { totalValue: true } }),
    prisma.tradingPair.count({ where: { isActive: true } }),
  ]);

  return {
    totalUsers: userCount,
    totalTrades: tradeCount,
    totalVolume: tradeAgg._sum.totalValue?.toString() || '0',
    activeTradingPairs: activePairs,
    connectedSockets: typeof getConnectionCount === 'function' ? getConnectionCount() : null,
  };
};

module.exports = {
  addTradingPair,
  removeTradingPair,
  resetUserPortfolio,
  getPlatformStats,
};
