const portfolioService = require('../services/portfolioService');
const analyticsService = require('../services/analyticsService');

const getPortfolio = async (req, res, next) => {
  try {
    const portfolio = await portfolioService.getPortfolio(req.user.id);
    res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    next(err);
  }
};

const getPortfolioAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getAnalytics(req.user.id);
    res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPortfolio, getPortfolioAnalytics };
