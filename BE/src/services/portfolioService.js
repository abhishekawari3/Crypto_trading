const Decimal = require('decimal.js');
const { prisma } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');
const priceFeedService = require('./priceFeedService');

const getPortfolio = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { holdings: true },
  });

  if (!user) throw new AppError('User not found', 404);

  const cashBalance = new Decimal(user.virtualBalance.toString());

  let holdingsValue = new Decimal(0);
  const holdingsWithLiveData = user.holdings.map((holding) => {
    const currentPrice = priceFeedService.getPrice(holding.symbol);
    const quantity = new Decimal(holding.quantity.toString());
    const avgBuyPrice = new Decimal(holding.avgBuyPrice.toString());

    let marketValue = new Decimal(0);
    let unrealizedPnl = new Decimal(0);
    let unrealizedPnlPercent = new Decimal(0);

    if (currentPrice !== undefined) {
      const priceDec = new Decimal(currentPrice);
      marketValue = quantity.times(priceDec);
      const costBasis = quantity.times(avgBuyPrice);
      unrealizedPnl = priceDec.minus(avgBuyPrice).times(quantity);
      unrealizedPnlPercent = costBasis.isZero()
        ? new Decimal(0)
        : unrealizedPnl.dividedBy(costBasis).times(100);
      holdingsValue = holdingsValue.plus(marketValue);
    }

    return {
      symbol: holding.symbol,
      quantity: quantity.toFixed(8),
      avgBuyPrice: avgBuyPrice.toFixed(8),
      currentPrice: currentPrice !== undefined ? currentPrice : null,
      marketValue: marketValue.toFixed(8),
      unrealizedPnl: unrealizedPnl.toFixed(8),
      unrealizedPnlPercent: unrealizedPnlPercent.toFixed(2),
    };
  });

  const portfolioValue = cashBalance.plus(holdingsValue);
  const initialBalance = new Decimal(user.initialBalance.toString());
  const totalPnl = portfolioValue.minus(initialBalance);
  const totalPnlPercent = initialBalance.isZero()
    ? new Decimal(0)
    : totalPnl.dividedBy(initialBalance).times(100);

  return {
    cashBalance: cashBalance.toFixed(8),
    holdingsValue: holdingsValue.toFixed(8),
    portfolioValue: portfolioValue.toFixed(8),
    initialBalance: initialBalance.toFixed(8),
    totalPnl: totalPnl.toFixed(8),
    totalPnlPercent: totalPnlPercent.toFixed(2),
    holdings: holdingsWithLiveData,
  };
};

module.exports = { getPortfolio };
