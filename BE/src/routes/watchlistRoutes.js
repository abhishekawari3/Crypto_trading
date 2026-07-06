const express = require('express');
const router = express.Router();

const watchlistController = require('../controllers/watchlistController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', watchlistController.getWatchlist);
router.post('/:symbol', watchlistController.addToWatchlist);
router.delete('/:symbol', watchlistController.removeFromWatchlist);

module.exports = router;
