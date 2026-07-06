const tradeService = require('../services/tradeService');

const buy = async (req, res, next) => {
  try {
    const trade = await tradeService.buy(req.user.id, req.body);
    res.status(201).json({ success: true, data: trade });
  } catch (err) {
    next(err);
  }
};

const sell = async (req, res, next) => {
  try {
    const trade = await tradeService.sell(req.user.id, req.body);
    res.status(201).json({ success: true, data: trade });
  } catch (err) {
    next(err);
  }
};

const getTradeHistory = async (req, res, next) => {
  try {
    const result = await tradeService.getHistory(req.user.id, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { buy, sell, getTradeHistory };
