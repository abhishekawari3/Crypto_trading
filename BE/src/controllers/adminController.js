const adminService = require('../services/adminService');
const { getIO } = require('../config/socket');

const addSymbol = async (req, res, next) => {
  try {
    const pair = await adminService.addTradingPair(req.body.symbol);
    res.status(201).json({ success: true, data: pair });
  } catch (err) {
    next(err);
  }
};

const removeSymbol = async (req, res, next) => {
  try {
    const result = await adminService.removeTradingPair(req.params.symbol);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const resetUser = async (req, res, next) => {
  try {
    const result = await adminService.resetUserPortfolio(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const getConnectionCount = () => {
      try {
        return getIO().engine.clientsCount;
      } catch (_) {
        return null;
      }
    };
    const stats = await adminService.getPlatformStats(getConnectionCount);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { addSymbol, removeSymbol, resetUser, getStats };
