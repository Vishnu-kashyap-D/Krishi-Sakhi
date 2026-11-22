const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CATEGORIES = ['seeds', 'fertilizers', 'pesticides', 'tools', 'machinery', 'crops', 'organic', 'dairy', 'livestock'];
const UNITS = ['kg', 'gram', 'liter', 'piece', 'quintal', 'ton', 'packet', 'box'];

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [3, 200] } },
  description: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  category: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [CATEGORIES] } },
  subCategory: { type: DataTypes.STRING, allowNull: true },
  price: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0 } },
  unit: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [UNITS] } },
  quantity: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0 } },
  minOrderQuantity: { type: DataTypes.FLOAT, defaultValue: 1, validate: { min: 0 } },
  images: { type: DataTypes.JSON, defaultValue: [] },
  sellerId: { type: DataTypes.INTEGER, allowNull: true },
  // Display name/contact used for seeded sample listings that have no user account.
  sellerName: { type: DataTypes.STRING, allowNull: true },
  location: { type: DataTypes.JSON, defaultValue: {} },
  isNegotiable: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
    validate: { isIn: [['active', 'sold', 'inactive', 'pending']] }
  },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  tags: { type: DataTypes.JSON, defaultValue: [] }
}, {
  tableName: 'products',
  indexes: [{ fields: ['category', 'status'] }, { fields: ['sellerId'] }]
});

Product.CATEGORIES = CATEGORIES;
Product.UNITS = UNITS;

module.exports = Product;
