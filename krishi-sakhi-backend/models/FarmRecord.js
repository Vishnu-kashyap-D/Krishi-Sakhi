const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ACTIVITY_TYPES = ['sowing', 'irrigation', 'fertilizer', 'pesticide', 'weeding', 'pest-observation', 'harvest', 'other'];

// Farm diary: what the farmer did (or observed) and when.
const FarmActivity = sequelize.define('FarmActivity', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [ACTIVITY_TYPES] } },
  crop: { type: DataTypes.STRING, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: true },
  unit: { type: DataTypes.STRING, allowNull: true },
  cost: { type: DataTypes.FLOAT, allowNull: true, validate: { min: 0 } },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'farm_activities',
  indexes: [{ fields: ['userId', 'date'] }]
});

// Reminders created by the farmer or generated from the crop calendar.
const Reminder = sequelize.define('Reminder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [2, 200] } },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  category: { type: DataTypes.STRING, defaultValue: 'task' },
  source: { type: DataTypes.STRING, defaultValue: 'user' }, // user | calendar
  done: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'reminders',
  indexes: [{ fields: ['userId', 'dueDate'] }]
});

FarmActivity.TYPES = ACTIVITY_TYPES;

module.exports = { FarmActivity, Reminder };
