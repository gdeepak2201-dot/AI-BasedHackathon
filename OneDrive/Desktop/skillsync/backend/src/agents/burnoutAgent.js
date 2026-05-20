/**
 * AI Agent 3: Burnout Prediction Agent
 * Uses a weighted scoring model (simulating Random Forest/XGBoost logic)
 * to predict burnout risk from time tracking, workload, and behavioral data.
 */
const { query } = require('../db/postgres');
const { aiCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

// Feature weights (simulating trained ML model coefficients)
const FEATURE_WEIGHTS = {
  overtimeRatio: 0.25,        // Overtime hours / total hours
  weekendActivity: 0.15,      // Weekend work frequency
  idleRatio: 0.10,            // Idle time ratio (low idle = overworked)
  taskOverdueRate: 0.20,      // % of overdue tasks
  leaveFrequency: 0.10,       // Frequent short leaves = stress signal
  deadlinePressure: 0.15,     // Tasks with tight deadlines
  productivityDrop: 0.05      // Recent productivity decline
};

class BurnoutAgent {
  /**
   * Check and update burnout risk for a user
   */
  static async checkAndUpdateRisk(userId) {
    const startTime = Date.now();
    try {
      const prediction = await this.getPrediction(userId);

      // Update workload log
      const weekStart = this._getWeekStart();
      await query(
        `INSERT INTO workload_logs (user_id, week_start, burnout_risk_score, stress_indicators)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, week_start) DO UPDATE SET
           burnout_risk_score = EXCLUDED.burnout_risk_score,
           stress_indicators = EXCLUDED.stress_indicators`,
        [userId, weekStart, prediction.riskScore, JSON.stringify(prediction.indicators)]
      );

      // Send alert if high risk
      if (prediction.riskScore > 0.7) {
        await this._createBurnoutAlert(userId, prediction);
      }

      // Invalidate cache
      aiCache.del(CachePilot.buildKey('burnout', userId));

      await this._logAgentAction('burnout_prediction', 'check_risk', { userId, riskScore: prediction.riskScore }, Date.now() - startTime);
      return prediction;
    } catch (error) {
      logger.error('BurnoutAgent.checkAndUpdateRisk error:', error);
      throw error;
    }
  }

  /**
   * Get burnout prediction for a user
   */
  static async getPrediction(userId) {
    const [timeData, taskData, leaveData] = await Promise.all([
      query(
        `SELECT 
           AVG(active_minutes) as avg_active,
           AVG(idle_minutes) as avg_idle,
           AVG(overtime_minutes) as avg_overtime,
           AVG(productivity_score) as avg_productivity,
           COUNT(*) FILTER (WHERE EXTRACT(DOW FROM date) IN (0, 6)) as weekend_days,
           COUNT(*) as total_days,
           AVG(productivity_score) FILTER (WHERE date >= NOW() - INTERVAL '7 days') as recent_productivity,
           AVG(productivity_score) FILTER (WHERE date BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '7 days') as prev_productivity
         FROM active_time_logs
         WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'`,
        [userId]
      ),
      query(
        `SELECT 
           COUNT(*) as total_tasks,
           COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue_tasks,
           COUNT(*) FILTER (WHERE deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days' AND status != 'completed') as urgent_tasks,
           SUM(estimated_hours) as total_estimated_hours
         FROM tasks t
         JOIN task_assignments ta ON t.id = ta.task_id
         WHERE ta.user_id = $1 AND t.status NOT IN ('completed')`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) as leave_count,
                COUNT(*) FILTER (WHERE leave_type = 'sick') as sick_leaves
         FROM leaves
         WHERE user_id = $1 AND status = 'approved'
         AND created_at >= NOW() - INTERVAL '90 days'`,
        [userId]
      )
    ]);

    const time = timeData.rows[0];
    const tasks = taskData.rows[0];
    const leaves = leaveData.rows[0];

    // Calculate feature values (0-1 scale)
    const features = {
      overtimeRatio: Math.min(1, (parseFloat(time.avg_overtime) || 0) / 120),
      weekendActivity: Math.min(1, (parseInt(time.weekend_days) || 0) / (parseInt(time.total_days) || 1)),
      idleRatio: 1 - Math.min(1, (parseFloat(time.avg_idle) || 0) / (parseFloat(time.avg_active) || 480)),
      taskOverdueRate: Math.min(1, (parseInt(tasks.overdue_tasks) || 0) / Math.max(1, parseInt(tasks.total_tasks) || 1)),
      leaveFrequency: Math.min(1, (parseInt(leaves.sick_leaves) || 0) / 3),
      deadlinePressure: Math.min(1, (parseInt(tasks.urgent_tasks) || 0) / 5),
      productivityDrop: this._calculateProductivityDrop(time.recent_productivity, time.prev_productivity)
    };

    // Weighted risk score
    const riskScore = Object.entries(FEATURE_WEIGHTS).reduce((score, [feature, weight]) => {
      return score + (features[feature] || 0) * weight;
    }, 0);

    const normalizedScore = Math.min(1, Math.max(0, riskScore));

    return {
      userId,
      riskScore: Math.round(normalizedScore * 100) / 100,
      riskLevel: this._getRiskLevel(normalizedScore),
      features,
      indicators: this._getStressIndicators(features),
      recommendations: this._getRecommendations(normalizedScore, features),
      dataPoints: {
        avgDailyHours: Math.round((parseFloat(time.avg_active) || 0) / 60 * 10) / 10,
        avgOvertimeHours: Math.round((parseFloat(time.avg_overtime) || 0) / 60 * 10) / 10,
        overdueTasks: parseInt(tasks.overdue_tasks) || 0,
        urgentTasks: parseInt(tasks.urgent_tasks) || 0,
        recentLeaves: parseInt(leaves.leave_count) || 0
      },
      predictedAt: new Date().toISOString()
    };
  }

  /**
   * Get team burnout overview for a manager
   */
  static async getTeamBurnoutOverview(managerId) {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, d.name as department,
              wl.burnout_risk_score, wl.stress_indicators,
              (SELECT COUNT(*) FROM task_assignments ta 
               JOIN tasks t ON ta.task_id = t.id 
               WHERE ta.user_id = u.id AND t.status NOT IN ('completed')) as active_tasks
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN workload_logs wl ON u.id = wl.user_id 
         AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
       JOIN project_members pm ON u.id = pm.user_id
       JOIN projects p ON pm.project_id = p.id
       WHERE p.manager_id = $1 AND u.is_active = TRUE
       ORDER BY wl.burnout_risk_score DESC NULLS LAST`,
      [managerId]
    );

    const employees = result.rows;
    const highRisk = employees.filter(e => (e.burnout_risk_score || 0) > 0.7);
    const mediumRisk = employees.filter(e => (e.burnout_risk_score || 0) > 0.4 && (e.burnout_risk_score || 0) <= 0.7);

    return {
      employees,
      summary: {
        total: employees.length,
        highRisk: highRisk.length,
        mediumRisk: mediumRisk.length,
        lowRisk: employees.length - highRisk.length - mediumRisk.length,
        avgRiskScore: employees.reduce((sum, e) => sum + (e.burnout_risk_score || 0), 0) / (employees.length || 1)
      },
      alerts: highRisk.map(e => ({
        userId: e.id,
        name: `${e.first_name} ${e.last_name}`,
        riskScore: e.burnout_risk_score,
        indicators: e.stress_indicators
      }))
    };
  }

  // Private helpers
  static _calculateProductivityDrop(recent, previous) {
    if (!recent || !previous) return 0;
    const drop = (parseFloat(previous) - parseFloat(recent)) / parseFloat(previous);
    return Math.max(0, Math.min(1, drop));
  }

  static _getRiskLevel(score) {
    if (score >= 0.75) return 'Critical';
    if (score >= 0.55) return 'High';
    if (score >= 0.35) return 'Moderate';
    return 'Low';
  }

  static _getStressIndicators(features) {
    const indicators = [];
    if (features.overtimeRatio > 0.5) indicators.push('Excessive overtime hours');
    if (features.weekendActivity > 0.3) indicators.push('Frequent weekend work');
    if (features.taskOverdueRate > 0.3) indicators.push('High overdue task rate');
    if (features.deadlinePressure > 0.6) indicators.push('Multiple urgent deadlines');
    if (features.productivityDrop > 0.2) indicators.push('Recent productivity decline');
    if (features.leaveFrequency > 0.5) indicators.push('Frequent sick leave usage');
    return indicators;
  }

  static _getRecommendations(score, features) {
    const recs = [];
    if (score > 0.7) recs.push('Immediate workload review recommended');
    if (features.overtimeRatio > 0.5) recs.push('Reduce overtime — consider task redistribution');
    if (features.weekendActivity > 0.3) recs.push('Encourage work-life balance and weekend disconnect');
    if (features.taskOverdueRate > 0.3) recs.push('Review task deadlines and priorities');
    if (features.deadlinePressure > 0.6) recs.push('Stagger deadlines to reduce pressure peaks');
    if (score < 0.3) recs.push('Employee is performing well — maintain current workload');
    return recs;
  }

  static _getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  static async _createBurnoutAlert(userId, prediction) {
    try {
      // Get user's manager
      const managerResult = await query(
        `SELECT DISTINCT p.manager_id FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         WHERE pm.user_id = $1 LIMIT 1`,
        [userId]
      );

      const userResult = await query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      if (managerResult.rows[0] && userResult.rows[0]) {
        const user = userResult.rows[0];
        await query(
          `INSERT INTO notifications (user_id, type, title, message, data, priority)
           VALUES ($1, 'burnout_alert', $2, $3, $4, 'high')`,
          [
            managerResult.rows[0].manager_id,
            `Burnout Risk Alert: ${user.first_name} ${user.last_name}`,
            `${user.first_name} ${user.last_name} has a ${prediction.riskLevel} burnout risk score of ${Math.round(prediction.riskScore * 100)}%. Immediate attention recommended.`,
            JSON.stringify({ userId, riskScore: prediction.riskScore, indicators: prediction.indicators })
          ]
        );
      }
    } catch (err) { /* non-blocking */ }
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

module.exports = BurnoutAgent;
