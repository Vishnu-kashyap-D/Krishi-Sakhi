const express = require('express');
const rateLimit = require('express-rate-limit');
const marketplaceController = require('../controllers/marketplaceController');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.MARKETPLACE_RATE_LIMIT || 300),
  message: { success: false, error: 'Too many marketplace requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
}));

router.get('/products', optionalAuth, marketplaceController.getProducts);
router.get('/products/:id', marketplaceController.getProductById);
router.get('/categories', marketplaceController.getCategories);

router.post('/products', authenticate, marketplaceController.createProduct);
router.put('/products/:id', authenticate, marketplaceController.updateProduct);
router.delete('/products/:id', authenticate, marketplaceController.deleteProduct);

module.exports = router;
