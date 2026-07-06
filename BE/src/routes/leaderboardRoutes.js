const express = require('express');
const router = express.Router();

const leaderboardController = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { leaderboardQuerySchema } = require('../validators/adminValidators');

router.use(authMiddleware);

router.get('/', validate(leaderboardQuerySchema, 'query'), leaderboardController.getLeaderboard);

module.exports = router;
