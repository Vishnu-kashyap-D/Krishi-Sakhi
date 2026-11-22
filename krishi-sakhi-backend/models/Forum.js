const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ForumPost = sequelize.define('ForumPost', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  // Name/location shown for posts (copied from the user at post time, or from seed data).
  authorName: { type: DataTypes.STRING, allowNull: false },
  authorLocation: { type: DataTypes.STRING, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [3, 200] } },
  content: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true, len: [1, 5000] } },
  category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'general' },
  language: { type: DataTypes.STRING, allowNull: false, defaultValue: 'en' },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  isSolved: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'forum_posts',
  indexes: [{ fields: ['category'] }, { fields: ['created_at'] }]
});

const ForumComment = sequelize.define('ForumComment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  postId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  authorName: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true, len: [1, 2000] } }
}, {
  tableName: 'forum_comments',
  indexes: [{ fields: ['postId', 'created_at'] }]
});

// One row per (user/visitor, post) so a like can only be counted once.
const ForumLike = sequelize.define('ForumLike', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  postId: { type: DataTypes.INTEGER, allowNull: false },
  likerKey: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'forum_likes',
  indexes: [{ unique: true, fields: ['postId', 'likerKey'] }]
});

const ExpertBooking = sequelize.define('ExpertBooking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  expertId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false },
  consultationType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'video',
    validate: { isIn: [['video', 'audio', 'chat']] }
  },
  issue: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }
}, {
  tableName: 'expert_bookings'
});

module.exports = { ForumPost, ForumComment, ForumLike, ExpertBooking };
