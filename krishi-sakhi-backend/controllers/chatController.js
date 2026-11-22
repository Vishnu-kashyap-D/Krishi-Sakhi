const { v4: uuidv4 } = require('uuid');
const chatbotService = require('../services/chatbotService');

const MAX_MESSAGE_LENGTH = 4000;

const buildContext = (body, user) => {
  const context = body.context || {};
  return {
    language: body.language || context.language || 'en',
    farmLocation: context.farmLocation || (user && user.location) || undefined,
    cropType: context.cropType,
    season: context.season,
    farmSize: context.farmSize || (user && user.farmDetails && user.farmDetails.totalAcres) || undefined,
    isVoice: Boolean(body.isVoice)
  };
};

const sendError = (res, error, fallback) => {
  const status = error.statusCode || 500;
  if (status >= 500 && status !== 503) console.error(fallback, error);
  res.status(status).json({ success: false, error: status === 500 ? fallback : error.message });
};

const sendMessage = async (req, res) => {
  const { message, sessionId, isVoice } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ success: false, error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
  }
  if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.length > 100)) {
    return res.status(400).json({ success: false, error: 'Invalid session ID' });
  }

  try {
    const chatSessionId = sessionId || uuidv4();
    const context = buildContext(req.body, req.user);
    const handler = isVoice ? chatbotService.processVoiceRequest : chatbotService.processChatRequest;
    const result = await handler(chatSessionId, message.trim(), req.user || null, context);

    res.json({
      success: true,
      data: {
        sessionId: chatSessionId,
        userMessage: result.userMessage,
        botMessage: result.botMessage,
        isVoice: Boolean(isVoice)
      },
      response: result.botMessage.message // kept for the voice assistant
    });
  } catch (error) {
    sendError(res, error, 'Failed to process message');
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await chatbotService.getChatHistory(sessionId, req.query.limit);
    const owner = messages.find((m) => m.userId != null);
    if (owner && (!req.user || req.user.id !== owner.userId)) {
      return res.status(403).json({ success: false, error: 'This chat session belongs to another user.' });
    }
    res.json({ success: true, data: { sessionId, messages, count: messages.length } });
  } catch (error) {
    sendError(res, error, 'Failed to fetch chat history');
  }
};

const updateFeedback = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { sessionId, helpful, rating, comment } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    const feedback = {};
    if (helpful !== undefined) feedback.helpful = Boolean(helpful);
    if (rating !== undefined) feedback.rating = Math.max(1, Math.min(5, Number(rating) || 0));
    if (comment !== undefined) feedback.comment = String(comment).slice(0, 1000);

    const updated = await chatbotService.updateMessageFeedback(messageId, sessionId, feedback);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    res.json({ success: true, data: { message: updated }, message: 'Feedback saved' });
  } catch (error) {
    sendError(res, error, 'Failed to update feedback');
  }
};

const getPopularQuestions = async (req, res) => {
  res.json({
    success: true,
    data: { questions: chatbotService.getPopularQuestions(), language: req.query.language || 'en' }
  });
};

const getChatSessions = async (req, res) => {
  try {
    const sessions = await chatbotService.getUserSessions(req.user.id);
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    sendError(res, error, 'Failed to fetch chat sessions');
  }
};

const createSession = async (req, res) => {
  try {
    const sessionId = uuidv4();
    const { initialMessage } = req.body || {};
    let result = null;
    if (typeof initialMessage === 'string' && initialMessage.trim()) {
      result = await chatbotService.processChatRequest(
        sessionId, initialMessage.trim(), req.user || null, buildContext(req.body, req.user)
      );
    }
    res.status(201).json({
      success: true,
      data: { sessionId, ...(result && { userMessage: result.userMessage, botMessage: result.botMessage }) },
      message: 'Chat session created successfully'
    });
  } catch (error) {
    sendError(res, error, 'Failed to create chat session');
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  updateFeedback,
  getPopularQuestions,
  getChatSessions,
  createSession
};
