const Decimal = require('decimal.js');
const { prisma } = require('../config/db');

/**
 * Computes realized PnL using FIFO cost-basis accounting.
 * Maintains a per-symbol queue of open BUY lots; each SELL consumes
 * the oldest lots first.
 */
const calculateFifoRealizedPnl = (trades) => {
  const lotsBySymbol = new Map(); // symbol -> [{ quantity, price }]
  let realizedPnl = new Decimal(0);
  let profitableSells = 0;
  let totalSells = 0;

  // Trades must be processed in chronological order for FIFO to be correct
  const chronological = [...trades].sort(
    (a, b) => new Date(a.executedAt) - new Date(b.executedAt)
  );

  for (const trade of chronological) {
    const qty = new Decimal(trade.quantity.toString());
    const price = new Decimal(trade.price.toString());

    if (!lotsBySymbol.has(trade.symbol)) {
      lotsBySymbol.set(trade.symbol, []);
    }
    const lots = lotsBySymbol.get(trade.symbol);

    if (trade.tradeType === 'BUY') {
      lots.push({ quantity: qty, price });
    } else {
      // SELL: consume oldest lots first (FIFO)
      let remaining = qty;
      let costBasis = new Decimal(0);

      while (remaining.greaterThan(0) && lots.length > 0) {
        const lot = lots[0];
        const consumeQty = Decimal.min(remaining, lot.quantity);

        costBasis = costBasis.plus(consumeQty.times(lot.price));
        lot.quantity = lot.quantity.minus(consumeQty);
        remaining = remaining.minus(consumeQty);

        if (lot.quantity.isZero()) {
          lots.shift();
        }
      }

      const proceeds = qty.times(price);
      const profit = proceeds.minus(costBasis);
      realizedPnl = realizedPnl.plus(profit);

      totalSells += 1;
      if (profit.greaterThan(0)) profitableSells += 1;
    }
  }

  const winRate = totalSells === 0 ? 0 : (profitableSells / totalSells) * 100;

  return { realizedPnl: realizedPnl.toFixed(8), winRate: winRate.toFixed(2) };
};

const getAnalytics = async (userId) => {
  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { executedAt: 'asc' },
  });

  const totalTrades = trades.length;
  const buyTrades = trades.filter((t) => t.tradeType === 'BUY').length;
  const sellTrades = trades.filter((t) => t.tradeType === 'SELL').length;

  const totalVolume = trades
    .reduce((sum, t) => sum.plus(new Decimal(t.totalValue.toString())), new Decimal(0))
    .toFixed(8);

  const assetCounts = {};
  for (const t of trades) {
    assetCounts[t.symbol] = (assetCounts[t.symbol] || 0) + 1;
  }
  const mostTradedAsset =
    Object.entries(assetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const { realizedPnl, winRate } = calculateFifoRealizedPnl(trades);

  return {
    totalTrades,
    buyTrades,
    sellTrades,
    totalVolume,
    winRate: `${winRate}%`,
    mostTradedAsset,
    realizedPnL: realizedPnl,
  };
};

module.exports = { getAnalytics, calculateFifoRealizedPnl };
