const app = require('./app');
const { testConnection, initializeDatabase } = require('./config/db');
const gemini = require('./services/geminiClient');

const PORT = Number(process.env.PORT) || 3001;

const start = async () => {
  try {
    await testConnection();
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Database initialisation failed:', error.message);
    process.exit(1);
  }

  if (!gemini.isConfigured()) {
    console.warn('⚠️ GEMINI_API_KEY is not set: the chatbot and crop image analysis will return 503 errors.');
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

start();
