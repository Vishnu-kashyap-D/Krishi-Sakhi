const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Limit brute-force attempts on the credential endpoints only.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 20),
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', credentialLimiter, authController.register);
router.post('/login', credentialLimiter, authController.login);

router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, credentialLimiter, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
