const express = require('express');
const rateLimit = require('express-rate-limit');
const cropAnalysisController = require('../controllers/cropAnalysisController');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.CROP_ANALYSIS_RATE_LIMIT || 20),
  message: { success: false, error: 'Too many image analyses, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/analyze', analysisLimiter, optionalAuth, cropAnalysisController.analyzeCropImage);
router.get('/history', authenticate, cropAnalysisController.getAnalysisHistory);
router.get('/supported-crops', cropAnalysisController.getSupportedCrops);
router.get('/diseases', cropAnalysisController.getCommonDiseases);

module.exports = router;
