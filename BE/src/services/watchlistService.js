const { prisma } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');
const priceFeedService = require('./priceFeedService');

const getWatchlist = async (userId) => {
  const items = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: { addedAt: 'desc' },
  });

  return items.map((item) => ({
    symbol: item.symbol,
    addedAt: item.addedAt,
    currentPrice: priceFeedService.getPrice(item.symbol) ?? null,
  }));
};

const addToWatchlist = async (userId, symbolRaw) => {
  const symbol = symbolRaw.toUpperCase();

  try {
    const item = await prisma.watchlist.create({
      data: { userId, symbol },
    });
    return item;
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(`${symbol} is already in your watchlist`, 409);
    }
    throw err;
  }
};

const removeFromWatchlist = async (userId, symbolRaw) => {
  const symbol = symbolRaw.toUpperCase();

  const result = await prisma.watchlist.deleteMany({
    where: { userId, symbol },
  });

  if (result.count === 0) {
    throw new AppError(`${symbol} not found in your watchlist`, 404);
  }

  return { symbol };
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
