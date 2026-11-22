// Express application (no network listener here so tests can import it).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { sequelize } = require('./config/db');
const gemini = require('./services/geminiClient');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / server-to-server requests (no Origin header) and configured origins.
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/v1/analyze', require('./routes/analysisRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
app.use('/api/weather', require('./routes/weatherRoutes'));
app.use('/api/languages', require('./routes/languageRoutes'));
app.use('/api/crop-analysis', require('./routes/cropAnalysisRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/farm', require('./routes/farmRoutes'));

app.get('/api/health', async (req, res) => {
  let database = 'ok';
  try {
    await sequelize.authenticate();
  } catch (error) {
    database = 'error';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    success: database === 'ok',
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    ai: gemini.isConfigured() ? { configured: true, model: gemini.getModelName() } : { configured: false },
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Krishi Sakhi API Server',
    version: '2.1.0',
    health: 'GET /api/health',
    endpoints: {
      farmAnalysis: ['POST /api/v1/analyze', 'GET /api/v1/analyze/history (auth)'],
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/profile', 'PUT /api/auth/profile', 'PUT /api/auth/change-password'],
      chat: ['POST /api/chat/message', 'GET /api/chat/history/:sessionId', 'GET /api/chat/popular-questions', 'GET /api/chat/sessions (auth)', 'PUT /api/chat/feedback/:messageId'],
      cropAnalysis: ['POST /api/crop-analysis/analyze (multipart "image")', 'GET /api/crop-analysis/history (auth)', 'GET /api/crop-analysis/supported-crops', 'GET /api/crop-analysis/diseases'],
      marketplace: ['GET /api/marketplace/products', 'GET /api/marketplace/products/:id', 'GET /api/marketplace/categories', 'POST/PUT/DELETE /api/marketplace/products (auth)'],
      weather: ['GET /api/weather/current?lat=&lon=', 'GET /api/weather/forecast?lat=&lon=&days=', 'GET /api/weather/agriculture?lat=&lon=&crop=', 'GET /api/weather/alerts?lat=&lon=', 'POST /api/weather/summary'],
      community: ['GET/POST /api/community/forum/posts', 'POST /api/community/forum/:id/like', 'POST /api/community/forum/:id/comment', 'POST /api/community/experts/book'],
      languages: ['GET /api/languages', 'GET /api/languages/region/:state', 'GET /api/languages/validate/:code', 'GET /api/languages/info/:code']
    },
    database: 'SQLite'
  });
});

// Unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body is too large' });
  }
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.statusCode ? err.message : 'Internal server error'
  });
});

module.exports = app;
