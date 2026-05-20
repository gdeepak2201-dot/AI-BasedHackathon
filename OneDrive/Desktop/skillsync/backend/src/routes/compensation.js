const express = require('express');
const { query } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/compensation - List all suggestions
router.get('/', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { status, departmentId } = req.query;
    const params = [];
    const conditions = [];

    if (status) { params.push(status); conditions.push(`cs.status = $${params.length}`); }
    if (departmentId) { params.push(departmentId); conditions.push(`u.department_id = $${params.length}`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT cs.*, u.first_name, u.last_name, u.email, u.avatar_url,
              d.name as department, r.name as role
       FROM compensation_suggestions cs
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY cs.overall_score DESC, cs.generated_at DESC`,
      params
    );

    res.json({ suggestions: result.rows });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/compensation/:id/review
router.patch('/:id/review', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const result = await query(
      `UPDATE compensation_suggestions 
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, req.userId, req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Suggestion not found' });
    res.json({ suggestion: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
