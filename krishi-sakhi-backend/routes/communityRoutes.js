const express = require('express');
const rateLimit = require('express-rate-limit');
const communityController = require('../controllers/communityController');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.COMMUNITY_WRITE_RATE_LIMIT || 60),
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Forum: anyone can read; posting and commenting need an account.
router.get('/forum/posts', communityController.getForumPosts);
router.post('/forum/posts', writeLimiter, authenticate, communityController.createForumPost);

// Expert connect
router.get('/experts', communityController.getExperts);
router.post('/experts/book', writeLimiter, optionalAuth, communityController.bookExpertConsultation);
router.get('/experts/bookings', authenticate, communityController.getMyBookings);

// Success stories
router.get('/stories', communityController.getSuccessStories);

// Likes and comments (contentType is currently "forum")
router.post('/:contentType/:contentId/like', writeLimiter, optionalAuth, communityController.likeContent);
router.post('/:contentType/:contentId/comment', writeLimiter, authenticate, communityController.addComment);

module.exports = router;
