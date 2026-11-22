const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, len: [2, 100] }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true, notEmpty: true },
    set(value) {
      this.setDataValue('email', String(value).trim().toLowerCase());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [6, 255] }
  },
  phone: { type: DataTypes.STRING, allowNull: true },
  // Free-form location: either a string ("Thrissur, Kerala") or an object
  // ({ state, district, lat, lng }).
  location: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  farmDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: { totalAcres: 0, crops: [], farmingType: 'conventional' }
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'farmer',
    validate: { isIn: [['farmer', 'buyer', 'admin']] }
  },
  avatar: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastLogin: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    }
  }
});

User.prototype.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const user = { ...this.get() };
  delete user.password;
  return user;
};

module.exports = User;
