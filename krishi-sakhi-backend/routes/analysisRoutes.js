// routes/analysisRoutes.js
const express = require('express');
const analysisController = require('../controllers/analysisController');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAuth, analysisController.getFarmAnalysis);
router.get('/history', authenticate, analysisController.getAnalysisHistory);

module.exports = router;
