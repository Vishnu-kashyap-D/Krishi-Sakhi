// config/db.js
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// SQLite database. The path is resolved relative to the backend folder so the
// server works no matter which directory it is started from.
const storage = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'database', 'krishi_sakhi.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

const testConnection = async () => {
  await sequelize.authenticate();
  console.log(`✅ Database connection established (${storage})`);
};

// Load every model, set up associations and create any missing tables.
const initializeDatabase = async () => {
  require('../models');
  // `sync()` only creates tables that do not exist yet; it never drops data.
  await sequelize.sync();
  await require('../models/seed').seedIfEmpty();
  console.log('✅ Database tables synchronized.');
};

module.exports = {
  sequelize,
  storage,
  testConnection,
  initializeDatabase
};
