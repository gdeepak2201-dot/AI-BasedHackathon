const express = require('express');
const { query } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const { dataCache, CachePilot } = require('../utils/cache');
const router = express.Router();

// GET /api/dashboard/employee - Employee dashboard stats
router.get('/employee', authenticate, async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('dashboard_employee', req.userId);
    const { data, fromCache } = await dataCache.getOrCompute(cacheKey, async () => {
      const [taskStats, recentTasks, timeStats, notifications] = await Promise.all([
        query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'pending') as pending,
             COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
             COUNT(*) FILTER (WHERE status = 'review') as in_review,
             COUNT(*) FILTER (WHERE status = 'completed') as completed,
             COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue
           FROM tasks t
           JOIN task_assignments ta ON t.id = ta.task_id
           WHERE ta.user_id = $1`,
          [req.userId]
        ),
        query(
          `SELECT t.id, t.title, t.status, t.priority, t.deadline, p.title as project_title
           FROM tasks t
           JOIN task_assignments ta ON t.id = ta.task_id
           JOIN projects p ON t.project_id = p.id
           WHERE ta.user_id = $1 AND t.status != 'completed'
           ORDER BY t.deadline ASC NULLS LAST LIMIT 5`,
          [req.userId]
        ),
        query(
          `SELECT 
             SUM(active_minutes) as total_active_this_week,
             AVG(productivity_score) as avg_productivity,
             SUM(overtime_minutes) as total_overtime
           FROM active_time_logs
           WHERE user_id = $1 AND date >= DATE_TRUNC('week', CURRENT_DATE)`,
          [req.userId]
        ),
        query(
          `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
          [req.userId]
        )
      ]);

      const burnoutResult = await query(
        `SELECT burnout_risk_score FROM workload_logs 
         WHERE user_id = $1 ORDER BY week_start DESC LIMIT 1`,
        [req.userId]
      );

      return {
        taskStats: taskStats.rows[0],
        recentTasks: recentTasks.rows,
        timeStats: timeStats.rows[0],
        unreadNotifications: parseInt(notifications.rows[0].count),
        burnoutRisk: burnoutResult.rows[0]?.burnout_risk_score || 0
      };
    }, 60);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/manager - Manager dashboard stats
router.get('/manager', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('dashboard_manager', req.userId);
    const { data } = await dataCache.getOrCompute(cacheKey, async () => {
      const [projectStats, teamStats, leaveStats, burnoutAlerts, taskDistribution] = await Promise.all([
        query(
          `SELECT 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'active') as active,
             COUNT(*) FILTER (WHERE status = 'completed') as completed,
             COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue
           FROM projects WHERE manager_id = $1`,
          [req.userId]
        ),
        query(
          `SELECT COUNT(DISTINCT pm.user_id) as team_size,
                  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as active_tasks,
                  AVG(atl.productivity_score) as avg_productivity
           FROM project_members pm
           JOIN projects p ON pm.project_id = p.id
           LEFT JOIN task_assignments ta ON pm.user_id = ta.user_id
           LEFT JOIN tasks t ON ta.task_id = t.id
           LEFT JOIN active_time_logs atl ON pm.user_id = atl.user_id 
             AND atl.date = CURRENT_DATE
           WHERE p.manager_id = $1`,
          [req.userId]
        ),
        query(
          `SELECT COUNT(*) FILTER (WHERE l.status = 'pending') as pending_leaves,
                  COUNT(*) FILTER (WHERE l.status = 'approved' AND l.start_date <= CURRENT_DATE AND l.end_date >= CURRENT_DATE) as on_leave_today
           FROM leaves l
           JOIN users u ON l.user_id = u.id
           JOIN project_members pm ON u.id = pm.user_id
           JOIN projects p ON pm.project_id = p.id
           WHERE p.manager_id = $1`,
          [req.userId]
        ),
        query(
          `SELECT u.id, u.first_name, u.last_name, u.avatar_url, wl.burnout_risk_score
           FROM workload_logs wl
           JOIN users u ON wl.user_id = u.id
           JOIN project_members pm ON u.id = pm.user_id
           JOIN projects p ON pm.project_id = p.id
           WHERE p.manager_id = $1 AND wl.burnout_risk_score > 0.6
           AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
           ORDER BY wl.burnout_risk_score DESC LIMIT 5`,
          [req.userId]
        ),
        query(
          `SELECT t.status, COUNT(*) as count
           FROM tasks t
           JOIN projects p ON t.project_id = p.id
           WHERE p.manager_id = $1
           GROUP BY t.status`,
          [req.userId]
        )
      ]);

      return {
        projectStats: projectStats.rows[0],
        teamStats: teamStats.rows[0],
        leaveStats: leaveStats.rows[0],
        burnoutAlerts: burnoutAlerts.rows,
        taskDistribution: taskDistribution.rows
      };
    }, 120);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/admin - Admin overview
router.get('/admin', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [orgStats, deptStats, aiAgentStats] = await Promise.all([
      query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_employees,
          (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
          (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') as tasks_in_progress,
          (SELECT COUNT(*) FROM leaves WHERE status = 'pending') as pending_leaves,
          (SELECT AVG(burnout_risk_score) FROM workload_logs WHERE week_start = DATE_TRUNC('week', CURRENT_DATE)) as avg_burnout_risk
      `),
      query(`
        SELECT d.name, COUNT(u.id) as employee_count,
               AVG(wl.burnout_risk_score) as avg_burnout
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id AND u.is_active = TRUE
        LEFT JOIN workload_logs wl ON u.id = wl.user_id 
          AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC
      `),
      query(`
        SELECT agent_name, COUNT(*) as executions, 
               AVG(execution_time_ms) as avg_time,
               COUNT(*) FILTER (WHERE status = 'success') as successes
        FROM ai_agent_logs
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY agent_name
      `)
    ]);

    res.json({
      orgStats: orgStats.rows[0],
      deptStats: deptStats.rows,
      aiAgentStats: aiAgentStats.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
