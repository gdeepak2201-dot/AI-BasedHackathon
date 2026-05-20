/**
 * AI Agent 4: Leave Impact & Redistribution Agent
 * Handles intelligent task redistribution when employees go on leave.
 * Implements the accept/decline workflow with fallback to next-day postponement.
 */
const { query, withTransaction } = require('../db/postgres');
const { aiCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

class LeaveImpactAgent {
  /**
   * Analyze the impact of a leave request on pending tasks
   */
  static async analyzeLeaveImpact(leaveId, userId, startDate, endDate) {
    const startTime = Date.now();
    try {
      // Find tasks affected during leave period
      const affectedTasks = await query(
        `SELECT t.id, t.title, t.priority, t.deadline, t.skill_tags, t.estimated_hours,
                p.title as project_title, p.id as project_id
         FROM tasks t
         JOIN task_assignments ta ON t.id = ta.task_id
         JOIN projects p ON t.project_id = p.id
         WHERE ta.user_id = $1
         AND t.status NOT IN ('completed')
         AND (t.deadline BETWEEN $2 AND $3 OR t.deadline IS NULL)
         ORDER BY t.priority DESC, t.deadline ASC`,
        [userId, startDate, endDate]
      );

      const tasks = affectedTasks.rows;
      const criticalTasks = tasks.filter(t => t.priority === 'critical' || t.priority === 'high');
      const leaveDays = this._calculateWorkingDays(new Date(startDate), new Date(endDate));

      const analysis = {
        totalAffectedTasks: tasks.length,
        criticalTasks: criticalTasks.length,
        leaveDurationDays: leaveDays,
        affectedTasks: tasks,
        riskLevel: criticalTasks.length > 3 ? 'high' : criticalTasks.length > 1 ? 'medium' : 'low',
        estimatedImpact: `${tasks.length} tasks may be delayed. ${criticalTasks.length} critical tasks need immediate redistribution.`
      };

      await this._logAgentAction('leave_impact', 'analyze', { leaveId, userId, taskCount: tasks.length }, Date.now() - startTime);
      return analysis;
    } catch (error) {
      logger.error('LeaveImpactAgent.analyzeLeaveImpact error:', error);
      return { totalAffectedTasks: 0, criticalTasks: 0, riskLevel: 'low' };
    }
  }

  /**
   * Trigger redistribution workflow for approved leave
   */
  static async triggerRedistribution(leaveId, userId, startDate, endDate) {
    const startTime = Date.now();
    try {
      // Get affected tasks
      const affectedTasks = await query(
        `SELECT t.id, t.title, t.priority, t.deadline, t.skill_tags, t.project_id
         FROM tasks t
         JOIN task_assignments ta ON t.id = ta.task_id
         WHERE ta.user_id = $1 AND t.status NOT IN ('completed')
         ORDER BY t.priority DESC`,
        [userId]
      );

      for (const task of affectedTasks.rows) {
        const suggestions = await this._findBestReplacements(task, userId);

        for (const suggestion of suggestions.slice(0, 3)) { // Top 3 suggestions per task
          await query(
            `INSERT INTO task_redistributions 
             (leave_id, task_id, original_assignee_id, suggested_assignee_id, ai_confidence_score)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [leaveId, task.id, userId, suggestion.userId, suggestion.confidenceScore]
          );

          // Send redistribution request notification
          await query(
            `INSERT INTO notifications (user_id, type, title, message, data, priority)
             VALUES ($1, 'redistribution_request', $2, $3, $4, $5)`,
            [
              suggestion.userId,
              'Task Redistribution Request',
              `You have been suggested to take over: "${task.title}" while a colleague is on leave.`,
              JSON.stringify({ leaveId, taskId: task.id, taskTitle: task.title, priority: task.priority }),
              task.priority === 'critical' ? 'high' : 'normal'
            ]
          );
        }
      }

      await this._logAgentAction('leave_impact', 'trigger_redistribution', { leaveId, taskCount: affectedTasks.rows.length }, Date.now() - startTime);
    } catch (error) {
      logger.error('LeaveImpactAgent.triggerRedistribution error:', error);
    }
  }

  /**
   * Handle when an employee declines a redistribution request
   * If all suggested employees decline, postpone to next working day
   */
  static async handleDecline(leaveId, taskId, io) {
    try {
      // Check if all suggestions for this task have been declined
      const redistributions = await query(
        `SELECT * FROM task_redistributions 
         WHERE leave_id = $1 AND task_id = $2`,
        [leaveId, taskId]
      );

      const allDeclined = redistributions.rows.every(r => r.status === 'declined');
      const hasPending = redistributions.rows.some(r => r.status === 'pending');

      if (allDeclined && !hasPending) {
        // All declined - postpone task
        const task = await query('SELECT *, project_id FROM tasks WHERE id = $1', [taskId]);
        const leave = await query('SELECT * FROM leaves WHERE id = $1', [leaveId]);

        if (task.rows[0] && leave.rows[0]) {
          const nextWorkingDay = this._getNextWorkingDay(new Date(leave.rows[0].end_date));

          // Update task deadline
          await query(
            `UPDATE tasks SET deadline = $1, updated_at = NOW() WHERE id = $2`,
            [nextWorkingDay.toISOString().split('T')[0], taskId]
          );

          // Notify manager
          const managerResult = await query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [task.rows[0].project_id]
          );

          if (managerResult.rows[0]) {
            await query(
              `INSERT INTO notifications (user_id, type, title, message, data, priority)
               VALUES ($1, 'task_postponed', $2, $3, $4, 'high')`,
              [
                managerResult.rows[0].manager_id,
                'Task Postponed - All Employees Declined',
                `Task "${task.rows[0].title}" has been postponed to ${nextWorkingDay.toLocaleDateString()} as all suggested employees declined redistribution.`,
                JSON.stringify({ taskId, leaveId, newDeadline: nextWorkingDay })
              ]
            );

            // Real-time notification
            if (io) {
              io.to(`user:${managerResult.rows[0].manager_id}`).emit('task_postponed', {
                taskId,
                taskTitle: task.rows[0].title,
                newDeadline: nextWorkingDay
              });
            }
          }

          // Generate new redistribution suggestions for next day
          await this._generateAlternativeSuggestions(leaveId, taskId, task.rows[0]);
        }
      }
    } catch (error) {
      logger.error('LeaveImpactAgent.handleDecline error:', error);
    }
  }

  // Private helpers
  static async _findBestReplacements(task, originalUserId) {
    // Find employees with matching skills who are not overloaded
    const candidates = await query(
      `SELECT u.id as "userId", u.first_name, u.last_name, u.skills,
              COUNT(ta.task_id) as active_task_count,
              wl.burnout_risk_score
       FROM users u
       LEFT JOIN task_assignments ta ON u.id = ta.user_id
         AND ta.status = 'active'
       LEFT JOIN workload_logs wl ON u.id = wl.user_id
         AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
       WHERE u.id != $1 AND u.is_active = TRUE
       AND (wl.burnout_risk_score IS NULL OR wl.burnout_risk_score < 0.7)
       GROUP BY u.id, u.first_name, u.last_name, u.skills, wl.burnout_risk_score
       HAVING COUNT(ta.task_id) < 10
       ORDER BY COUNT(ta.task_id) ASC`,
      [originalUserId]
    );

    const taskSkills = task.skill_tags || [];

    return candidates.rows.map(candidate => {
      const skillMatch = taskSkills.length > 0
        ? taskSkills.filter(s => (candidate.skills || []).includes(s)).length / taskSkills.length
        : 0.5;
      const workloadScore = 1 - Math.min(1, (candidate.active_task_count || 0) / 10);
      const burnoutScore = 1 - (candidate.burnout_risk_score || 0);
      const confidenceScore = (skillMatch * 0.5) + (workloadScore * 0.3) + (burnoutScore * 0.2);

      return { ...candidate, skillMatch, workloadScore, confidenceScore };
    }).sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  static async _generateAlternativeSuggestions(leaveId, taskId, task) {
    // Generate fresh suggestions excluding all who already declined
    const declinedUsers = await query(
      `SELECT suggested_assignee_id FROM task_redistributions 
       WHERE leave_id = $1 AND task_id = $2 AND status = 'declined'`,
      [leaveId, taskId]
    );

    const declinedIds = declinedUsers.rows.map(r => r.suggested_assignee_id);
    const originalAssignee = await query(
      'SELECT original_assignee_id FROM task_redistributions WHERE leave_id = $1 AND task_id = $2 LIMIT 1',
      [leaveId, taskId]
    );

    if (originalAssignee.rows[0]) {
      const newSuggestions = await this._findBestReplacements(task, originalAssignee.rows[0].original_assignee_id);
      const filteredSuggestions = newSuggestions.filter(s => !declinedIds.includes(s.userId));

      for (const suggestion of filteredSuggestions.slice(0, 2)) {
        await query(
          `INSERT INTO task_redistributions 
           (leave_id, task_id, original_assignee_id, suggested_assignee_id, ai_confidence_score)
           VALUES ($1, $2, $3, $4, $5)`,
          [leaveId, taskId, originalAssignee.rows[0].original_assignee_id, suggestion.userId, suggestion.confidenceScore]
        );
      }
    }
  }

  static _calculateWorkingDays(start, end) {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  static _getNextWorkingDay(date) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  static async _logAgentAction(agentName, action, data, executionTime) {
    try {
      await query(
        `INSERT INTO ai_agent_logs (agent_name, action, input_data, execution_time_ms)
         VALUES ($1, $2, $3, $4)`,
        [agentName, action, JSON.stringify(data), executionTime]
      );
    } catch (err) { /* non-blocking */ }
  }
}

module.exports = LeaveImpactAgent;
