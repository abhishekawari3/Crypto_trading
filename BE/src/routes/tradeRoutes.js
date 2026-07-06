const express = require('express');
const router = express.Router();

const tradeController = require('../controllers/tradeController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { tradeLimiter } = require('../middleware/rateLimitMiddleware');
const { tradeSchema, tradeHistorySchema } = require('../validators/tradeValidators');

router.use(authMiddleware);

router.post('/buy', tradeLimiter, validate(tradeSchema), tradeController.buy);
router.post('/sell', tradeLimiter, validate(tradeSchema), tradeController.sell);
router.get(
  '/history',
  validate(tradeHistorySchema, 'query'),
  tradeController.getTradeHistory
);

module.exports = router;
