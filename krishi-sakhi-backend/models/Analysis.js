const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Stored farm (land) analysis reports.
const FarmAnalysis = sequelize.define('FarmAnalysis', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  farmName: { type: DataTypes.STRING, allowNull: true },
  latitude: { type: DataTypes.FLOAT, allowNull: false },
  longitude: { type: DataTypes.FLOAT, allowNull: false },
  acres: { type: DataTypes.FLOAT, allowNull: false },
  report: { type: DataTypes.JSON, allowNull: false }
}, {
  tableName: 'farm_analyses',
  indexes: [{ fields: ['userId', 'created_at'] }]
});

// Stored crop image analyses (the image itself is not stored).
const CropAnalysis = sequelize.define('CropAnalysis', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  cropType: { type: DataTypes.STRING, allowNull: true },
  healthScore: { type: DataTypes.INTEGER, allowNull: true },
  issueCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  result: { type: DataTypes.JSON, allowNull: false }
}, {
  tableName: 'crop_analyses',
  indexes: [{ fields: ['userId', 'created_at'] }]
});

module.exports = { FarmAnalysis, CropAnalysis };
