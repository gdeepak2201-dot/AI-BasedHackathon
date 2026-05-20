const express = require('express');
const { query } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, COUNT(u.id) as employee_count,
              m.first_name || ' ' || m.last_name as manager_name
       FROM departments d
       LEFT JOIN users u ON d.id = u.department_id AND u.is_active = TRUE
       LEFT JOIN users m ON d.manager_id = m.id
       GROUP BY d.id, m.first_name, m.last_name
       ORDER BY d.name`
    );
    res.json({ departments: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, description, managerId } = req.body;
    const result = await query(
      'INSERT INTO departments (name, description, manager_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, managerId]
    );
    res.status(201).json({ department: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
