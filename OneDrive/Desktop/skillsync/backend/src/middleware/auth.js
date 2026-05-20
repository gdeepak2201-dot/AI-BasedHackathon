const jwt = require('jsonwebtoken');
const { query } = require('../db/postgres');
const { sessionCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Cache-pilot: check session cache before hitting DB
    const cacheKey = CachePilot.buildKey('user', decoded.userId);
    const { data: user, fromCache } = await sessionCache.getOrCompute(
      cacheKey,
      async () => {
        const result = await query(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, 
                  u.department_id, u.is_active, u.avatar_url, u.skills,
                  r.name as role_name, r.permissions
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.id = $1 AND u.is_active = TRUE`,
          [decoded.userId]
        );
        return result.rows[0] || null;
      },
      900 // 15 min session cache
    );

    if (!user) {
      sessionCache.del(cacheKey);
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role_name
      });
    }
    next();
  };
};

const authorizeOwnerOrManager = (userIdField = 'userId') => {
  return (req, res, next) => {
    const targetUserId = req.params[userIdField] || req.body[userIdField];
    const isOwner = req.userId === targetUserId;
    const isManager = ['manager', 'admin'].includes(req.user.role_name);

    if (!isOwner && !isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = { authenticate, authorize, authorizeOwnerOrManager };
