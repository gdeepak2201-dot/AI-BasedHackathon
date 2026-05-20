const express = require('express');
const { query, withTransaction } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const LeaveImpactAgent = require('../agents/leaveImpactAgent');
const router = express.Router();

// GET /api/leaves
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let params = [];
    let conditions = [];

    if (!isManager) {
      params.push(req.userId);
      conditions.push(`l.user_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`l.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT l.*,
              u.first_name || ' ' || u.last_name as employee_name,
              u.email as employee_email,
              d.name as department_name,
              a.first_name || ' ' || a.last_name as approved_by_name
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users a ON l.approved_by = a.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ leaves: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/leaves - Apply for leave
router.post('/', authenticate, validate(schemas.createLeave), async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    // Check for overlapping leaves
    const overlap = await query(
      `SELECT id FROM leaves 
       WHERE user_id = $1 AND status != 'rejected'
       AND (start_date, end_date) OVERLAPS ($2::date, $3::date)`,
      [req.userId, startDate, endDate]
    );

    if (overlap.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a leave request for this period' });
    }

    const result = await query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, leaveType, startDate, endDate, reason]
    );

    const leave = result.rows[0];

    // Async: Run AI impact analysis
    setImmediate(async () => {
      try {
        const analysis = await LeaveImpactAgent.analyzeLeaveImpact(leave.id, req.userId, startDate, endDate);
        await query(
          'UPDATE leaves SET ai_impact_analysis = $1 WHERE id = $2',
          [JSON.stringify(analysis), leave.id]
        );
      } catch (err) { /* non-blocking */ }
    });

    // Notify managers
    const io = req.app.get('io');
    if (io) {
      const managers = await query(
        `SELECT u.id FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE r.name IN ('manager', 'admin') AND u.department_id = $1`,
        [req.user.department_id]
      );
      managers.rows.forEach(m => {
        io.to(`user:${m.id}`).emit('leave_request', {
          leaveId: leave.id,
          employeeName: `${req.user.first_name} ${req.user.last_name}`,
          startDate,
          endDate,
          leaveType
        });
      });
    }

    res.status(201).json({ leave, message: 'Leave request submitted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/leaves/:id/approve
router.patch('/:id/approve', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const result = await query(
      `UPDATE leaves SET status = $1, approved_by = $2, approved_at = NOW(),
       rejection_reason = $3, updated_at = NOW()
       WHERE id = $4 AND status = 'pending'
       RETURNING *`,
      [status, req.userId, rejectionReason || null, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Leave request not found or already processed' });
    }

    const leave = result.rows[0];

    // If approved, trigger redistribution agent
    if (status === 'approved') {
      setImmediate(async () => {
        try {
          await LeaveImpactAgent.triggerRedistribution(leave.id, leave.user_id, leave.start_date, leave.end_date);
        } catch (err) { /* non-blocking */ }
      });
    }

    // Notify employee
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${leave.user_id}`).emit('leave_decision', {
        leaveId: leave.id,
        status,
        message: status === 'approved' ? 'Your leave has been approved' : `Leave rejected: ${rejectionReason}`
      });
    }

    res.json({ leave, message: `Leave ${status} successfully` });
  } catch (error) {
    next(error);
  }
});

// GET /api/leaves/:id/redistribution
router.get('/:id/redistribution', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT tr.*,
              t.title as task_title, t.priority, t.deadline,
              oa.first_name || ' ' || oa.last_name as original_assignee_name,
              sa.first_name || ' ' || sa.last_name as suggested_assignee_name,
              sa.skills as suggested_assignee_skills
       FROM task_redistributions tr
       JOIN tasks t ON tr.task_id = t.id
       LEFT JOIN users oa ON tr.original_assignee_id = oa.id
       LEFT JOIN users sa ON tr.suggested_assignee_id = sa.id
       WHERE tr.leave_id = $1
       ORDER BY tr.created_at DESC`,
      [req.params.id]
    );

    res.json({ redistributions: result.rows });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/leaves/redistribution/:redistributionId/respond
router.patch('/redistribution/:redistributionId/respond', authenticate, async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'accept' | 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept or decline' });
    }

    const redistResult = await query(
      `UPDATE task_redistributions 
       SET status = $1, response_reason = $2, responded_at = NOW()
       WHERE id = $3 AND suggested_assignee_id = $4 AND status = 'pending'
       RETURNING *`,
      [action === 'accept' ? 'accepted' : 'declined', reason, req.params.redistributionId, req.userId]
    );

    if (!redistResult.rows[0]) {
      return res.status(404).json({ error: 'Redistribution request not found' });
    }

    const redistribution = redistResult.rows[0];

    if (action === 'accept') {
      // Reassign task
      await withTransaction(async (client) => {
        await client.query(
          'UPDATE task_assignments SET user_id = $1 WHERE task_id = $2 AND user_id = $3',
          [req.userId, redistribution.task_id, redistribution.original_assignee_id]
        );
        await client.query(
          'UPDATE tasks SET updated_at = NOW() WHERE id = $1',
          [redistribution.task_id]
        );
      });
    } else {
      // Check if all suggested employees declined
      await LeaveImpactAgent.handleDecline(redistribution.leave_id, redistribution.task_id, req.app.get('io'));
    }

    res.json({ message: `Task ${action}ed successfully`, redistribution });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
