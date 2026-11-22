// Shared Google Gemini client. The API key is read only from the environment.
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-2.5-flash';

class AIUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'AIUnavailableError';
    this.statusCode = 503;
    this.cause = cause;
  }
}

let client = null;

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);
const getModelName = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

const getModel = (options = {}) => {
  if (!isConfigured()) {
    throw new AIUnavailableError('AI service is not configured. Set GEMINI_API_KEY in krishi-sakhi-backend/.env.');
  }
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client.getGenerativeModel({ model: getModelName(), ...options });
};

// Converts SDK errors into a short, user-safe message.
const toAIError = (error) => {
  if (error instanceof AIUnavailableError) return error;
  const status = error && error.status;
  let message = 'The AI service could not process the request. Please try again.';
  if (status === 429) message = 'The AI service is busy (rate limit reached). Please try again in a minute.';
  else if (status === 400 && /API key/i.test(error.message || '')) message = 'The configured Gemini API key is invalid.';
  else if (status === 403) message = 'The configured Gemini API key does not have access to this model.';
  else if (status === 404) message = `The Gemini model "${getModelName()}" is not available. Set GEMINI_MODEL to a supported model.`;
  console.error('Gemini error:', status || '', error && error.message);
  return new AIUnavailableError(message, error);
};

module.exports = { getModel, getModelName, isConfigured, toAIError, AIUnavailableError };
