const express = require('express');
const router = express.Router();

const marketController = require('../controllers/marketController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', marketController.getAllPrices);
router.get('/pairs', marketController.getActivePairs);
router.get('/:symbol', marketController.getSymbolPrice);

module.exports = router;
