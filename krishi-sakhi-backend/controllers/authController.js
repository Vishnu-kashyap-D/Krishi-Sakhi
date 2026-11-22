const { ValidationError, UniqueConstraintError } = require('sequelize');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only these fields can be changed through the profile endpoint.
const PROFILE_FIELDS = ['name', 'phone', 'location', 'farmDetails', 'avatar'];

const validationMessage = (error) => (
  error.errors && error.errors.length ? error.errors.map((e) => e.message).join(', ') : error.message
);

const register = async (req, res) => {
  try {
    const { name, email, password, phone, location, farmDetails, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    if (!EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne({ where: { email: normalizedEmail } })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Public sign-up can only create farmer or buyer accounts.
    const safeRole = ['farmer', 'buyer'].includes(role) ? role : 'farmer';

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: safeRole,
      ...(phone && { phone }),
      ...(location && { location }),
      ...(farmDetails && { farmDetails })
    });

    res.status(201).json({
      success: true,
      data: { user: user.toJSON(), token: generateToken(user.id) },
      message: 'Registration successful'
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: validationMessage(error) });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email: String(email).trim().toLowerCase() } });
    if (!user || !(await user.comparePassword(String(password)))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      data: { user: user.toJSON(), token: generateToken(user.id) },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getProfile = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toJSON() } });
};

const updateProfile = async (req, res) => {
  try {
    const updates = {};
    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (typeof updates.name === 'string') updates.name = updates.name.trim();

    await req.user.update(updates);
    res.json({
      success: true,
      data: { user: req.user.toJSON() },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: validationMessage(error) });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    if (!(await req.user.comparePassword(String(currentPassword)))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    req.user.password = String(newPassword);
    await req.user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Tokens are stateless; the client discards its token on logout.
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};
