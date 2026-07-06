const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const validate = require('../middleware/validateMiddleware');
const { addSymbolSchema } = require('../validators/adminValidators');

router.use(authMiddleware, adminMiddleware);

router.post('/symbols', validate(addSymbolSchema), adminController.addSymbol);
router.delete('/symbols/:symbol', adminController.removeSymbol);
router.post('/reset-user/:id', adminController.resetUser);
router.get('/stats', adminController.getStats);

module.exports = router;
