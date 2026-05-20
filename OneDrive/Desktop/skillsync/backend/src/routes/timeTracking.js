const express = require('express');
const { query } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { dataCache, CachePilot } = require('../utils/cache');
const BurnoutAgent = require('../agents/burnoutAgent');
const router = express.Router();

// POST /api/time-tracking/log - Log daily activity
router.post('/log', authenticate, async (req, res, next) => {
  try {
    const { date, loginTime, logoutTime, activeMinutes, idleMinutes, breakMinutes, appUsage } = req.body;

    const overtimeMinutes = Math.max(0, (activeMinutes || 0) - 480); // 8 hours = 480 min
    const productivityScore = activeMinutes > 0
      ? Math.min(1, (activeMinutes - (idleMinutes || 0)) / activeMinutes)
      : 0;

    const result = await query(
      `INSERT INTO active_time_logs 
       (user_id, date, login_time, logout_time, active_minutes, idle_minutes, break_minutes, overtime_minutes, productivity_score, app_usage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, date) DO UPDATE SET
         login_time = COALESCE(EXCLUDED.login_time, active_time_logs.login_time),
         logout_time = COALESCE(EXCLUDED.logout_time, active_time_logs.logout_time),
         active_minutes = EXCLUDED.active_minutes,
         idle_minutes = EXCLUDED.idle_minutes,
         break_minutes = EXCLUDED.break_minutes,
         overtime_minutes = EXCLUDED.overtime_minutes,
         productivity_score = EXCLUDED.productivity_score,
         app_usage = EXCLUDED.app_usage,
         updated_at = NOW()
       RETURNING *`,
      [req.userId, date, loginTime, logoutTime, activeMinutes, idleMinutes, breakMinutes, overtimeMinutes, productivityScore, JSON.stringify(appUsage || {})]
    );

    // Async burnout check
    setImmediate(async () => {
      try {
        await BurnoutAgent.checkAndUpdateRisk(req.userId);
      } catch (err) { /* non-blocking */ }
    });

    dataCache.del(CachePilot.buildKey('timelog', req.userId));
    res.json({ log: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// GET /api/time-tracking/my-logs
router.get('/my-logs', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const params = [req.userId];
    let dateFilter = '';
    if (startDate) { params.push(startDate); dateFilter += ` AND date >= $${params.length}`; }
    if (endDate) { params.push(endDate); dateFilter += ` AND date <= $${params.length}`; }

    const result = await query(
      `SELECT * FROM active_time_logs 
       WHERE user_id = $1 ${dateFilter}
       ORDER BY date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    // Weekly summary
    const summary = await query(
      `SELECT 
         DATE_TRUNC('week', date) as week,
         SUM(active_minutes) as total_active,
         SUM(idle_minutes) as total_idle,
         SUM(overtime_minutes) as total_overtime,
         AVG(productivity_score) as avg_productivity,
         COUNT(*) as days_logged
       FROM active_time_logs
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '4 weeks'
       GROUP BY DATE_TRUNC('week', date)
       ORDER BY week DESC`,
      [req.userId]
    );

    res.json({ logs: result.rows, weeklySummary: summary.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/time-tracking/team - Manager view
router.get('/team', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { date, departmentId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const params = [targetDate];
    let deptFilter = '';
    if (departmentId) {
      params.push(departmentId);
      deptFilter = `AND u.department_id = $${params.length}`;
    }

    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, d.name as department,
              atl.active_minutes, atl.idle_minutes, atl.overtime_minutes,
              atl.productivity_score, atl.login_time, atl.logout_time,
              wl.burnout_risk_score
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN active_time_logs atl ON u.id = atl.user_id AND atl.date = $1
       LEFT JOIN workload_logs wl ON u.id = wl.user_id 
         AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
       WHERE u.is_active = TRUE ${deptFilter}
       ORDER BY atl.active_minutes DESC NULLS LAST`,
      params
    );

    res.json({ teamActivity: result.rows, date: targetDate });
  } catch (error) {
    next(error);
  }
});

// GET /api/time-tracking/productivity-trend
router.get('/productivity-trend', authenticate, async (req, res, next) => {
  try {
    const userId = req.query.userId || req.userId;
    const isManager = ['manager', 'admin'].includes(req.user.role_name);

    if (userId !== req.userId && !isManager) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT date, active_minutes, idle_minutes, overtime_minutes, productivity_score
       FROM active_time_logs
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'
       ORDER BY date ASC`,
      [userId]
    );

    res.json({ trend: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
