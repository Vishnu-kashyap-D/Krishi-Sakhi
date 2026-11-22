const { Op, fn, col } = require('sequelize');
const ChatMessage = require('../models/ChatMessage');
const { FarmActivity } = require('../models/FarmRecord');
const { getModel, getModelName, toAIError } = require('./geminiClient');
const { getLanguageInfo } = require('../config/languages');
const { CROPS, resolveCrop } = require('../data/cropKnowledge');

const SYSTEM_PROMPT = `
You are Krishi Sakhi (कृषि सखी), an agricultural assistant for Indian farmers. You give practical advice on:
- crop selection and cultivation practices
- soil health and fertilizer use
- pest and disease management
- weather-based farming decisions
- market and selling strategies
- government agricultural schemes
- sustainable and organic farming

Guidelines:
1. Give practical, location-specific advice when the location is known.
2. Consider Indian climate, seasons (kharif, rabi, zaid, monsoon) and local crops.
3. Use simple, farmer-friendly language and short paragraphs or bullet points.
4. Give actionable steps with timing and quantities where appropriate.
5. Warn about unsafe pesticide use and recommend protective equipment.
6. Prefer low-cost and sustainable solutions.
7. If you are unsure, say so and suggest contacting the local Krishi Vigyan Kendra (KVK) or agriculture officer.
8. Politely decline questions that are unrelated to farming, rural livelihoods or the weather.
`;

const VOICE_SYSTEM_PROMPT = `${SYSTEM_PROMPT}
Your reply will be read aloud by a speech synthesiser:
- keep it under about 120 words
- do not use markdown, bullet symbols, tables or emojis
- use short, natural spoken sentences and end with one clear next step
`;

const languageName = (code) => {
  const base = String(code || 'en').split('-')[0];
  const info = getLanguageInfo(base);
  return info ? info.name : 'English';
};

const buildPrompt = (message, context = {}) => {
  const lines = [];
  const loc = context.farmLocation;
  if (loc) {
    const place = typeof loc === 'string'
      ? loc
      : [loc.district, loc.state].filter(Boolean).join(', ');
    const coords = loc && loc.lat != null && loc.lng != null ? ` (${loc.lat}, ${loc.lng})` : '';
    if (place || coords) lines.push(`Farm location: ${place}${coords}`);
  }
  if (context.cropType) lines.push(`Current crop: ${context.cropType}`);
  const fd = context.farmDetails || {};
  if (fd.crops && fd.crops.length) lines.push(`Crops grown: ${fd.crops.join(', ')}`);
  if (fd.soilType) lines.push(`Soil type: ${fd.soilType}`);
  if (fd.irrigation) lines.push(`Irrigation: ${fd.irrigation}`);
  if (context.recentActivities && context.recentActivities.length) {
    lines.push(`Farmer's recent diary: ${context.recentActivities.map((a) => `${a.date} ${a.type}${a.crop ? ` (${a.crop})` : ''}${a.notes ? `: ${a.notes.slice(0, 80)}` : ''}`).join('; ')}`);
  }
  // Local knowledge base for the crops in question
  const cropKeys = new Set([context.cropType, ...(fd.crops || []), message].map(resolveCrop).filter(Boolean));
  [...cropKeys].slice(0, 2).forEach((k) => {
    const c = CROPS[k];
    lines.push(`Local reference for ${c.name}: seasons ${c.seasons.map((s) => `${s.name} sow ${s.sow}`).join('; ')}; common pests ${c.pests.map((p) => p.name).join(', ')}.`);
  });
  if (context.season) lines.push(`Season: ${context.season}`);
  if (context.farmSize) lines.push(`Farm size: ${context.farmSize} acres`);
  lines.push(`Today's date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Reply in ${languageName(context.language)}.`);
  return `${lines.join('\n')}\n\nFarmer's question: ${message}`;
};

// Converts stored messages into Gemini chat history (must start with a user turn).
const toHistory = (messages) => {
  const history = messages
    .filter((m) => m.type === 'user' || m.type === 'bot')
    .map((m) => ({ role: m.type === 'user' ? 'user' : 'model', parts: [{ text: m.message }] }));
  while (history.length && history[0].role !== 'user') history.shift();
  return history;
};

const generateResponse = async (message, context = {}, previousMessages = []) => {
  const startTime = Date.now();
  try {
    const model = getModel({ systemInstruction: context.isVoice ? VOICE_SYSTEM_PROMPT : SYSTEM_PROMPT });
    const chat = model.startChat({
      history: toHistory(previousMessages),
      generationConfig: { temperature: 0.6, maxOutputTokens: context.isVoice ? 512 : 2048 }
    });
    const result = await chat.sendMessage(buildPrompt(message, context));
    const text = result.response.text();
    if (!text || !text.trim()) {
      throw Object.assign(new Error('Empty response from Gemini'), { status: 502 });
    }
    const usage = result.response.usageMetadata || {};
    return {
      message: text.trim(),
      metadata: {
        model: getModelName(),
        processingTime: Date.now() - startTime,
        tokens: { input: usage.promptTokenCount || 0, output: usage.candidatesTokenCount || 0 }
      }
    };
  } catch (error) {
    throw toAIError(error);
  }
};

const getChatHistory = (sessionId, limit = 50) => ChatMessage.findAll({
  where: { sessionId },
  order: [['created_at', 'ASC'], ['id', 'ASC']],
  limit: Math.min(parseInt(limit, 10) || 50, 200)
});

const getRecentMessages = async (sessionId, limit = 10) => {
  const messages = await ChatMessage.findAll({
    where: { sessionId },
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit
  });
  return messages.reverse();
};

const processChatRequest = async (sessionId, userMessage, user = null, context = {}) => {
  const recent = await getRecentMessages(sessionId, 10);

  // A session that already belongs to another user cannot be continued.
  const owner = recent.find((m) => m.userId != null);
  if (owner && (!user || owner.userId !== user.id)) {
    const err = new Error('This chat session belongs to another user.');
    err.statusCode = 403;
    throw err;
  }

  if (user) {
    context.farmDetails = user.farmDetails || {};
    context.recentActivities = await FarmActivity.findAll({ where: { userId: user.id }, order: [['date', 'DESC']], limit: 5, raw: true });
  }

  // Ask the AI first so a failed request does not leave a half-saved exchange.
  const aiResponse = await generateResponse(userMessage, context, recent);

  const storedContext = {
    farmLocation: context.farmLocation,
    cropType: context.cropType,
    season: context.season,
    farmSize: context.farmSize,
    isVoice: Boolean(context.isVoice)
  };

  const savedUser = await ChatMessage.create({
    userId: user ? user.id : null,
    sessionId,
    type: 'user',
    message: userMessage,
    language: context.language || 'en',
    context: storedContext
  });
  const savedBot = await ChatMessage.create({
    userId: user ? user.id : null,
    sessionId,
    type: 'bot',
    message: aiResponse.message,
    language: context.language || 'en',
    context: storedContext,
    metadata: aiResponse.metadata
  });

  return { userMessage: savedUser, botMessage: savedBot };
};

const processVoiceRequest = (sessionId, voiceMessage, user = null, context = {}) => (
  processChatRequest(sessionId, voiceMessage, user, { ...context, isVoice: true })
);

const updateMessageFeedback = async (messageId, sessionId, feedback) => {
  const message = await ChatMessage.findOne({ where: { id: messageId, sessionId, type: 'bot' } });
  if (!message) return null;
  await message.update({ feedback: { ...(message.feedback || {}), ...feedback, updatedAt: new Date() } });
  return message;
};

// Lists a user's sessions with their latest message.
const getUserSessions = async (userId, limit = 20) => {
  const rows = await ChatMessage.findAll({
    where: { userId },
    attributes: ['sessionId', [fn('MAX', col('created_at')), 'lastActivity'], [fn('COUNT', col('id')), 'messageCount']],
    group: ['sessionId'],
    order: [[fn('MAX', col('created_at')), 'DESC']],
    limit,
    raw: true
  });
  if (!rows.length) return [];

  const latest = await ChatMessage.findAll({
    where: { sessionId: { [Op.in]: rows.map((r) => r.sessionId) }, type: 'user' },
    order: [['created_at', 'DESC']],
    raw: true
  });
  return rows.map((r) => ({
    sessionId: r.sessionId,
    lastActivity: r.lastActivity,
    messageCount: Number(r.messageCount),
    lastMessage: (latest.find((m) => m.sessionId === r.sessionId) || {}).message || ''
  }));
};

const getPopularQuestions = () => [
  {
    category: 'general',
    questions: [
      'What crops are best for my region?',
      'How do I test my soil quality?',
      'What fertilizer should I use?',
      'How to deal with pests naturally?'
    ]
  },
  {
    category: 'weather',
    questions: [
      'Should I irrigate before rain?',
      'How to protect crops from heavy rain?',
      'Best time to sow seeds?',
      'Drought management techniques?'
    ]
  }
];

module.exports = {
  generateResponse,
  getChatHistory,
  getRecentMessages,
  processChatRequest,
  processVoiceRequest,
  updateMessageFeedback,
  getUserSessions,
  getPopularQuestions
};
