const express = require('express');
const rateLimit = require('express-rate-limit');
const chatController = require('../controllers/chatController');
const { optionalAuth, authenticate } = require('../middleware/auth');

const router = express.Router();

// AI calls cost money; limit how many messages one client can send.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.CHAT_RATE_LIMIT || 50),
  message: { success: false, error: 'Too many chat requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/popular-questions', chatController.getPopularQuestions);
router.post('/message', chatLimiter, optionalAuth, chatController.sendMessage);
router.post('/session', chatLimiter, optionalAuth, chatController.createSession);
router.get('/history/:sessionId', optionalAuth, chatController.getChatHistory);
router.put('/feedback/:messageId', optionalAuth, chatController.updateFeedback);
router.get('/sessions', authenticate, chatController.getChatSessions);

module.exports = router;
