const leaderboardService = require('../services/leaderboardService');

const getLeaderboard = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await leaderboardService.getLeaderboard(limit);
    res.status(200).json({ success: true, data: result.data, cached: result.cached });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard };
