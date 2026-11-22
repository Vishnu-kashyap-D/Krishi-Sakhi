const { Op, ValidationError } = require('sequelize');
const { Product, User } = require('../models');

const SORT_FIELDS = { created_at: 'created_at', price: 'price', title: 'title', views: 'views' };
const EDITABLE_FIELDS = ['title', 'description', 'category', 'subCategory', 'price', 'unit', 'quantity',
  'minOrderQuantity', 'images', 'location', 'isNegotiable', 'status', 'tags'];

const toPublic = (p) => {
  const json = p.toJSON();
  const seller = json.seller
    ? { id: json.seller.id, name: json.seller.name, location: json.seller.location, phone: json.seller.phone || null }
    : { id: null, name: json.sellerName || 'Krishi Sakhi seller', location: json.location };
  delete json.sellerName;
  return { ...json, seller };
};

const includeSeller = [{ model: User, as: 'seller', attributes: ['id', 'name', 'location', 'phone'] }];

const validationMessage = (error) => error.errors.map((e) => e.message).join(', ');

const getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { category, search, location, minPrice, maxPrice } = req.query;
    const sortBy = SORT_FIELDS[req.query.sortBy] || 'created_at';
    const sortOrder = String(req.query.sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // ?mine=true lists the logged-in seller's own listings (any status).
    const mine = req.query.mine === 'true' && req.user;
    const where = mine ? { sellerId: req.user.id } : { status: 'active' };
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    const price = {};
    if (minPrice !== undefined && minPrice !== '' && Number.isFinite(Number(minPrice))) price[Op.gte] = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '' && Number.isFinite(Number(maxPrice))) price[Op.lte] = Number(maxPrice);
    if (Object.getOwnPropertySymbols(price).length) where.price = price;

    let { rows, count } = await Product.findAndCountAll({
      where,
      include: includeSeller,
      order: [[sortBy, sortOrder]],
      limit: location ? undefined : limit,
      offset: location ? undefined : (page - 1) * limit
    });

    // Location is stored as JSON, so it is filtered after the query.
    if (location) {
      const needle = String(location).toLowerCase();
      rows = rows.filter((p) => JSON.stringify(p.location || {}).toLowerCase().includes(needle));
      count = rows.length;
      rows = rows.slice((page - 1) * limit, page * limit);
    }

    res.json({
      success: true,
      data: {
        products: rows.map(toPublic),
        pagination: {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(count / limit)),
          totalProducts: count,
          productsPerPage: limit
        },
        filters: { category, search, location, priceRange: { min: minPrice, max: maxPrice } }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: includeSeller });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    await product.increment('views');
    res.json({ success: true, data: { product: toPublic(product) } });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
};

const pickFields = (body) => {
  const data = {};
  for (const f of EDITABLE_FIELDS) if (body[f] !== undefined) data[f] = body[f];
  return data;
};

const createProduct = async (req, res) => {
  try {
    const data = pickFields(req.body || {});
    const missing = ['title', 'description', 'category', 'price', 'unit', 'quantity'].filter((f) => data[f] === undefined || data[f] === '');
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }
    const product = await Product.create({
      ...data,
      price: Number(data.price),
      quantity: Number(data.quantity),
      location: data.location || req.user.location || {},
      status: 'active',
      sellerId: req.user.id
    });
    await product.reload({ include: includeSeller });
    res.status(201).json({ success: true, data: { product: toPublic(product) }, message: 'Product created successfully' });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: validationMessage(error) });
    }
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};

const loadOwnedProduct = async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found' });
    return null;
  }
  if (product.sellerId !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'You can only change your own listings' });
    return null;
  }
  return product;
};

const updateProduct = async (req, res) => {
  try {
    const product = await loadOwnedProduct(req, res);
    if (!product) return;
    await product.update(pickFields(req.body || {}));
    await product.reload({ include: includeSeller });
    res.json({ success: true, data: { product: toPublic(product) }, message: 'Product updated successfully' });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, error: validationMessage(error) });
    }
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await loadOwnedProduct(req, res);
    if (!product) return;
    await product.destroy();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
};

const CATEGORY_INFO = [
  { id: 'seeds', name: 'Seeds', subcategories: [{ id: 'rice-seeds', name: 'Rice Seeds' }, { id: 'vegetable-seeds', name: 'Vegetable Seeds' }, { id: 'fruit-seeds', name: 'Fruit Seeds' }] },
  { id: 'fertilizers', name: 'Fertilizers', subcategories: [{ id: 'organic', name: 'Organic Fertilizers' }, { id: 'chemical', name: 'Chemical Fertilizers' }, { id: 'npk', name: 'NPK Fertilizers' }] },
  { id: 'pesticides', name: 'Pesticides', subcategories: [] },
  { id: 'tools', name: 'Tools & Equipment', subcategories: [{ id: 'hand-tools', name: 'Hand Tools' }, { id: 'irrigation', name: 'Irrigation Equipment' }] },
  { id: 'machinery', name: 'Machinery', subcategories: [] },
  { id: 'crops', name: 'Fresh Produce', subcategories: [{ id: 'vegetables', name: 'Vegetables' }, { id: 'fruits', name: 'Fruits' }, { id: 'grains', name: 'Grains' }] },
  { id: 'organic', name: 'Organic Products', subcategories: [] },
  { id: 'dairy', name: 'Dairy', subcategories: [] },
  { id: 'livestock', name: 'Livestock', subcategories: [] }
];

const getCategories = async (req, res) => {
  res.json({ success: true, data: { categories: CATEGORY_INFO, units: Product.UNITS } });
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
};
