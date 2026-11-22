import apiClient from './client';

// ============================================
// FARM ANALYSIS API
// ============================================
export const analysisAPI = {
  analyzeFarm: async (data) => (await apiClient.post('/v1/analyze', data)).data,
  getHistory: async (limit = 20) => (await apiClient.get('/v1/analyze/history', { params: { limit } })).data,
};

// ============================================
// CROP IMAGE ANALYSIS API
// ============================================
export const cropAnalysisAPI = {
  analyzeImage: async (file, cropType = 'auto-detect') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('cropType', cropType);
    return (await apiClient.post('/crop-analysis/analyze', formData, { timeout: 120000 })).data;
  },
  getHistory: async (limit = 10) => (await apiClient.get('/crop-analysis/history', { params: { limit } })).data,
  getSupportedCrops: async () => (await apiClient.get('/crop-analysis/supported-crops')).data,
};

// ============================================
// CHATBOT API
// ============================================
export const chatAPI = {
  createSession: async (initialMessage = null, context = {}) => (
    await apiClient.post('/chat/session', { initialMessage, context })
  ).data,

  sendMessage: async (message, sessionId, context = {}) => (
    await apiClient.post('/chat/message', {
      message,
      sessionId,
      language: context.language || 'en',
      context,
      isVoice: context.isVoice || false,
    }, { timeout: 90000 })
  ).data,

  getChatHistory: async (sessionId, limit = 50) => (
    await apiClient.get(`/chat/history/${sessionId}`, { params: { limit } })
  ).data,

  getPopularQuestions: async (language = 'en') => (
    await apiClient.get('/chat/popular-questions', { params: { language } })
  ).data,

  updateFeedback: async (messageId, sessionId, feedback) => (
    await apiClient.put(`/chat/feedback/${messageId}`, { sessionId, ...feedback })
  ).data,

  getChatSessions: async () => (await apiClient.get('/chat/sessions')).data,
};

// ============================================
// MARKETPLACE API
// ============================================
export const marketplaceAPI = {
  getProducts: async (filters = {}) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    return (await apiClient.get('/marketplace/products', { params })).data;
  },
  getProductById: async (id) => (await apiClient.get(`/marketplace/products/${id}`)).data,
  createProduct: async (productData) => (await apiClient.post('/marketplace/products', productData)).data,
  updateProduct: async (id, productData) => (await apiClient.put(`/marketplace/products/${id}`, productData)).data,
  deleteProduct: async (id) => (await apiClient.delete(`/marketplace/products/${id}`)).data,
  getCategories: async () => (await apiClient.get('/marketplace/categories')).data,
};

// ============================================
// WEATHER API
// ============================================
export const weatherAPI = {
  getCurrentWeather: async (lat, lon) => (await apiClient.get('/weather/current', { params: { lat, lon } })).data,
  getForecast: async (lat, lon, days = 7) => (await apiClient.get('/weather/forecast', { params: { lat, lon, days } })).data,
  getAgricultureAdvice: async (lat, lon, crop) => (await apiClient.get('/weather/agriculture', { params: { lat, lon, crop } })).data,
};

// ============================================
// COMMUNITY API
// ============================================
export const communityAPI = {
  getPosts: async (filters = {}) => (await apiClient.get('/community/forum/posts', { params: filters })).data,
  createPost: async (post) => (await apiClient.post('/community/forum/posts', post)).data,
  likePost: async (postId) => (await apiClient.post(`/community/forum/${postId}/like`)).data,
  addComment: async (postId, comment) => (await apiClient.post(`/community/forum/${postId}/comment`, { comment })).data,
  bookExpert: async (booking) => (await apiClient.post('/community/experts/book', booking)).data,
};

// ============================================
// MY FARM API (diary, reminders, advisory, knowledge)
// ============================================
export const farmAPI = {
  getAdvisory: async () => (await apiClient.get('/farm/advisory')).data,
  getActivities: async () => (await apiClient.get('/farm/activities')).data,
  addActivity: async (a) => (await apiClient.post('/farm/activities', a)).data,
  deleteActivity: async (id) => (await apiClient.delete(`/farm/activities/${id}`)).data,
  getReminders: async () => (await apiClient.get('/farm/reminders')).data,
  addReminder: async (r) => (await apiClient.post('/farm/reminders', r)).data,
  updateReminder: async (id, patch) => (await apiClient.patch(`/farm/reminders/${id}`, patch)).data,
  deleteReminder: async (id) => (await apiClient.delete(`/farm/reminders/${id}`)).data,
  getKnowledge: async (crop) => (await apiClient.get('/farm/knowledge', { params: crop ? { crop } : {} })).data,
  getPrices: async (commodity, state = 'Kerala') => (await apiClient.get('/farm/prices', { params: { commodity, state } })).data,
};

// ============================================
// LANGUAGES API
// ============================================
export const languageAPI = {
  getLanguages: async () => (await apiClient.get('/languages')).data,
};

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: async (userData) => (await apiClient.post('/auth/register', userData)).data,
  login: async (credentials) => (await apiClient.post('/auth/login', credentials)).data,
  getProfile: async () => (await apiClient.get('/auth/profile')).data,
  updateProfile: async (profileData) => (await apiClient.put('/auth/profile', profileData)).data,
  changePassword: async (currentPassword, newPassword) => (
    await apiClient.put('/auth/change-password', { currentPassword, newPassword })
  ).data,
  logout: async () => (await apiClient.post('/auth/logout')).data,
};

export default {
  analysis: analysisAPI,
  cropAnalysis: cropAnalysisAPI,
  chat: chatAPI,
  marketplace: marketplaceAPI,
  weather: weatherAPI,
  community: communityAPI,
  languages: languageAPI,
  auth: authAPI,
};
