const priceFeedService = require('../services/priceFeedService');
const { prisma } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');

const getAllPrices = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: priceFeedService.getAllPrices() });
  } catch (err) {
    next(err);
  }
};

const getActivePairs = async (req, res, next) => {
  try {
    const pairs = await prisma.tradingPair.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
    });
    res.status(200).json({ success: true, data: pairs });
  } catch (err) {
    next(err);
  }
};

const getSymbolPrice = async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const price = priceFeedService.getPrice(symbol);

    if (price === undefined) {
      throw new AppError(`No price data available for ${symbol}`, 404);
    }

    res.status(200).json({ success: true, data: { symbol, price } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPrices, getActivePairs, getSymbolPrice };
