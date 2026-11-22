// Loads every model and defines the associations between them.
const User = require('./User');
const ChatMessage = require('./ChatMessage');
const Product = require('./Product');
const { ForumPost, ForumComment, ForumLike, ExpertBooking } = require('./Forum');
const { FarmAnalysis, CropAnalysis } = require('./Analysis');
const { FarmActivity, Reminder } = require('./FarmRecord');

// `constraints: false` keeps SQLite from adding foreign keys to tables that
// already exist; the relationships are still usable for includes/queries.
const opts = { constraints: false };

User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'chatMessages', ...opts });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user', ...opts });

User.hasMany(Product, { foreignKey: 'sellerId', as: 'products', ...opts });
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller', ...opts });

ForumPost.hasMany(ForumComment, { foreignKey: 'postId', as: 'comments', ...opts });
ForumComment.belongsTo(ForumPost, { foreignKey: 'postId', as: 'post', ...opts });

module.exports = {
  User,
  ChatMessage,
  Product,
  ForumPost,
  ForumComment,
  ForumLike,
  ExpertBooking,
  FarmAnalysis,
  CropAnalysis,
  FarmActivity,
  Reminder
};
