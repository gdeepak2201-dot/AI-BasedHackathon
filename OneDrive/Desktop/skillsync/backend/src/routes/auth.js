const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/postgres');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { sessionCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

const router = express.Router();

const generateTokens = (userId, roleId) => {
  const payload = { userId, roleId };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, departmentId, roleId } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role_id, created_at`,
      [email, passwordHash, firstName, lastName, roleId || 1, departmentId || null]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id, user.role_id);

    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT u.*, r.name as role_name, r.permissions,
              d.name as department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role_id);

    await query(
      'UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2',
      [refreshToken, user.id]
    );

    // Cache user session
    const cacheKey = CachePilot.buildKey('user', user.id);
    sessionCache.set(cacheKey, {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id,
      role_name: user.role_name,
      permissions: user.permissions,
      department_id: user.department_id,
      department_name: user.department_name,
      avatar_url: user.avatar_url,
      skills: user.skills,
      is_active: user.is_active
    }, 900);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        permissions: user.permissions,
        department: user.department_name,
        avatarUrl: user.avatar_url,
        skills: user.skills
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const result = await query(
      'SELECT id, role_id, refresh_token FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token mismatch' });
    }

    const tokens = generateTokens(user.id, user.role_id);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.userId]);
    sessionCache.del(CachePilot.buildKey('user', req.userId));
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role_name,
      permissions: req.user.permissions,
      departmentId: req.user.department_id,
      avatarUrl: req.user.avatar_url,
      skills: req.user.skills
    }
  });
});

module.exports = router;
