const express = require('express');
const router = express.Router();

const portfolioController = require('../controllers/portfolioController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', portfolioController.getPortfolio);
router.get('/analytics', portfolioController.getPortfolioAnalytics);

module.exports = router;
