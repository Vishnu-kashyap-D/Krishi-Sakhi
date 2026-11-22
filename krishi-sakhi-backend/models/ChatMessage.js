const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  sessionId: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [['user', 'bot', 'system']] }
  },
  message: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  // Any supported language code (en, hi, ta, te, kn, ... or a BCP-47 tag like hi-IN)
  language: { type: DataTypes.STRING, defaultValue: 'en' },
  context: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  metadata: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  feedback: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'chat_messages',
  indexes: [
    { fields: ['sessionId', 'created_at'] },
    { fields: ['userId', 'created_at'] }
  ]
});

module.exports = ChatMessage;
