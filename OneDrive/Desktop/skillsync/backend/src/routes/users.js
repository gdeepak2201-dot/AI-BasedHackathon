const express = require('express');
const multer = require('multer');
const path = require('path');
const { query } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const { dataCache, CachePilot, sessionCache } = require('../utils/cache');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || 'uploads'),
  filename: (req, file, cb) => cb(null, `${req.userId}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 } });

// GET /api/users - List users (manager/admin)
router.get('/', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { departmentId, role, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const params = [];
    const conditions = ['u.is_active = TRUE'];

    if (departmentId) { params.push(departmentId); conditions.push(`u.department_id = $${params.length}`); }
    if (role) { params.push(role); conditions.push(`r.name = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.skills,
              u.hire_date, u.last_login, r.name as role, d.name as department,
              u.department_id, u.role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.first_name, u.last_name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({
      users: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].count) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    const isSelf = req.params.id === req.userId;

    if (!isManager && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cacheKey = CachePilot.buildKey('user_profile', req.params.id);
    const { data: user } = await dataCache.getOrCompute(cacheKey, async () => {
      const result = await query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.skills,
                u.hire_date, u.last_login, u.phone, u.metadata,
                r.name as role, d.name as department, d.id as department_id,
                (SELECT COUNT(*) FROM task_assignments ta WHERE ta.user_id = u.id) as total_tasks,
                (SELECT COUNT(*) FROM task_assignments ta 
                 JOIN tasks t ON ta.task_id = t.id 
                 WHERE ta.user_id = u.id AND t.status = 'completed') as completed_tasks,
                (SELECT AVG(overall_score) FROM peer_reviews WHERE reviewee_id = u.id) as avg_peer_score
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = $1`,
        [req.params.id]
      );
      return result.rows[0];
    }, 120);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update profile
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const isSelf = req.params.id === req.userId;
    const isAdmin = req.user.role_name === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { firstName, lastName, phone, skills } = req.body;

    const result = await query(
      `UPDATE users SET 
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         phone = COALESCE($3, phone),
         skills = COALESCE($4, skills),
         updated_at = NOW()
       WHERE id = $5 RETURNING id, email, first_name, last_name, phone, skills, avatar_url`,
      [firstName, lastName, phone, skills ? JSON.stringify(skills) : null, req.params.id]
    );

    // Invalidate caches
    sessionCache.del(CachePilot.buildKey('user', req.params.id));
    dataCache.del(CachePilot.buildKey('user_profile', req.params.id));

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/avatar
router.post('/:id/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (req.params.id !== req.userId && req.user.role_name !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const avatarUrl = `/uploads/${req.file.filename}`;
    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.params.id]);

    sessionCache.del(CachePilot.buildKey('user', req.params.id));
    res.json({ avatarUrl });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id/workload
router.get('/:id/workload', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    if (req.params.id !== req.userId && !isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await query(
      `SELECT t.id, t.title, t.status, t.priority, t.deadline, t.estimated_hours,
              p.title as project_title
       FROM tasks t
       JOIN task_assignments ta ON t.id = ta.task_id
       JOIN projects p ON t.project_id = p.id
       WHERE ta.user_id = $1 AND t.status NOT IN ('completed')
       ORDER BY t.deadline ASC NULLS LAST`,
      [req.params.id]
    );

    const workloadLog = await query(
      `SELECT * FROM workload_logs WHERE user_id = $1 ORDER BY week_start DESC LIMIT 4`,
      [req.params.id]
    );

    res.json({ activeTasks: tasks.rows, workloadHistory: workloadLog.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
