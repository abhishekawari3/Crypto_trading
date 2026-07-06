const watchlistService = require('../services/watchlistService');

const getWatchlist = async (req, res, next) => {
  try {
    const items = await watchlistService.getWatchlist(req.user.id);
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const addToWatchlist = async (req, res, next) => {
  try {
    const item = await watchlistService.addToWatchlist(req.user.id, req.params.symbol);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const removeFromWatchlist = async (req, res, next) => {
  try {
    const result = await watchlistService.removeFromWatchlist(req.user.id, req.params.symbol);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
