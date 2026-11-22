const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// A JWT secret must be configured for real deployments. For local development
// we fall back to a random per-process secret (tokens stop working after a
// restart) instead of a guessable hardcoded string.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️ JWT_SECRET is not set; using a temporary secret. Logins will reset when the server restarts.');
}

const getToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
};

const loadUser = async (token) => {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || decoded.id == null) return null;
  return User.findByPk(decoded.id);
};

// Requires a valid token.
const authenticate = async (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const user = await loadUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Session is no longer valid. Please log in again.' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

// Attaches req.user when a valid token is present; never rejects the request.
const optionalAuth = async (req, res, next) => {
  const token = getToken(req);
  if (token) {
    try {
      const user = await loadUser(token);
      if (user) req.user = user;
    } catch (error) {
      // Invalid token on a public route: continue as a guest.
    }
  }
  next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  }
  next();
};

const generateToken = (userId) => jwt.sign(
  { id: userId },
  JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  generateToken,
  verifyToken
};
