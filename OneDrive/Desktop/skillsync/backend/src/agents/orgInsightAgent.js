/**
 * AI Agent 6: Organizational Insight Agent
 * Detects bottlenecks, overloaded teams, and structural inefficiencies.
 */
const { query } = require('../db/postgres');
const { aiCache } = require('../utils/cache');
const logger = require('../utils/logger');

class OrgInsightAgent {
  static async generateInsights() {
    const startTime = Date.now();
    try {
      const [bottlenecks, overloadedEmployees, delayedProjects, deptWorkload, dependencyRisks] = await Promise.all([
        this._detectBottlenecks(),
        this._findOverloadedEmployees(),
        this._analyzeDelayedProjects(),
        this._analyzeDepartmentWorkload(),
        this._detectDependencyRisks()
      ]);

      const insights = {
        bottlenecks,
        overloadedEmployees,
        delayedProjects,
        deptWorkload,
        dependencyRisks,
        riskAlerts: this._generateRiskAlerts(bottlenecks, overloadedEmployees, delayedProjects),
        recommendations: this._generateOrgRecommendations(bottlenecks, overloadedEmployees, delayedProjects),
        generatedAt: new Date().toISOString()
      };

      await this._logAgentAction('org_insight', 'generate_insights', {}, Date.now() - startTime);
      return insights;
    } catch (error) {
      logger.error('OrgInsightAgent.generateInsights error:', error);
      throw error;
    }
  }

  static async _detectBottlenecks() {
    const result = await query(
      `SELECT u.id, u.first_name || ' ' || u.last_name as name, d.name as department,
              COUNT(ta.task_id) as task_count,
              COUNT(ta.task_id) FILTER (WHERE t.status = 'review') as review_pending,
              COUNT(ta.task_id) FILTER (WHERE t.deadline < NOW() AND t.status != 'completed') as overdue
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN task_assignments ta ON u.id = ta.user_id
       LEFT JOIN tasks t ON ta.task_id = t.id
       WHERE u.is_active = TRUE
       GROUP BY u.id, u.first_name, u.last_name, d.name
       HAVING COUNT(ta.task_id) > 8 OR COUNT(ta.task_id) FILTER (WHERE t.status = 'review') > 3
       ORDER BY task_count DESC LIMIT 10`
    );
    return result.rows;
  }

  static async _findOverloadedEmployees() {
    const result = await query(
      `SELECT u.id, u.first_name || ' ' || u.last_name as name, d.name as department,
              wl.burnout_risk_score,
              COUNT(ta.task_id) as active_tasks,
              SUM(t.estimated_hours) as total_estimated_hours
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN workload_logs wl ON u.id = wl.user_id 
         AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
       LEFT JOIN task_assignments ta ON u.id = ta.user_id
       LEFT JOIN tasks t ON ta.task_id = t.id AND t.status NOT IN ('completed')
       WHERE u.is_active = TRUE
       GROUP BY u.id, u.first_name, u.last_name, d.name, wl.burnout_risk_score
       HAVING wl.burnout_risk_score > 0.6 OR COUNT(ta.task_id) > 10
       ORDER BY wl.burnout_risk_score DESC NULLS LAST LIMIT 10`
    );
    return result.rows;
  }

  static async _analyzeDelayedProjects() {
    const result = await query(
      `SELECT p.id, p.title, p.deadline, p.status,
              u.first_name || ' ' || u.last_name as manager_name,
              COUNT(t.id) as total_tasks,
              COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
              COUNT(t.id) FILTER (WHERE t.deadline < NOW() AND t.status != 'completed') as overdue_tasks,
              ROUND(COUNT(t.id) FILTER (WHERE t.status = 'completed')::numeric / NULLIF(COUNT(t.id), 0) * 100) as completion_pct
       FROM projects p
       LEFT JOIN users u ON p.manager_id = u.id
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.status = 'active' AND p.deadline < NOW() + INTERVAL '14 days'
       GROUP BY p.id, p.title, p.deadline, p.status, u.first_name, u.last_name
       ORDER BY p.deadline ASC LIMIT 10`
    );
    return result.rows;
  }

  static async _analyzeDepartmentWorkload() {
    const result = await query(
      `SELECT d.name as department,
              COUNT(DISTINCT u.id) as employee_count,
              COUNT(DISTINCT t.id) as active_tasks,
              AVG(wl.burnout_risk_score) as avg_burnout,
              COUNT(DISTINCT p.id) as active_projects
       FROM departments d
       LEFT JOIN users u ON d.id = u.department_id AND u.is_active = TRUE
       LEFT JOIN task_assignments ta ON u.id = ta.user_id
       LEFT JOIN tasks t ON ta.task_id = t.id AND t.status NOT IN ('completed')
       LEFT JOIN workload_logs wl ON u.id = wl.user_id 
         AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
       LEFT JOIN project_members pm ON u.id = pm.user_id
       LEFT JOIN projects p ON pm.project_id = p.id AND p.status = 'active'
       GROUP BY d.id, d.name
       ORDER BY active_tasks DESC`
    );
    return result.rows;
  }

  static async _detectDependencyRisks() {
    const result = await query(
      `SELECT t.id, t.title, t.deadline, t.status,
              dt.title as depends_on_title, dt.status as depends_on_status,
              p.title as project_title
       FROM task_dependencies td
       JOIN tasks t ON td.task_id = t.id
       JOIN tasks dt ON td.depends_on_task_id = dt.id
       JOIN projects p ON t.project_id = p.id
       WHERE t.status NOT IN ('completed')
       AND dt.status NOT IN ('completed')
       AND t.deadline < NOW() + INTERVAL '7 days'
       ORDER BY t.deadline ASC LIMIT 10`
    );
    return result.rows;
  }

  static _generateRiskAlerts(bottlenecks, overloaded, delayed) {
    const alerts = [];

    if (bottlenecks.length > 0) {
      alerts.push({
        type: 'bottleneck',
        severity: 'high',
        message: `${bottlenecks.length} employee(s) are creating workflow bottlenecks with excessive task loads`,
        affectedCount: bottlenecks.length
      });
    }

    if (overloaded.length > 0) {
      alerts.push({
        type: 'overload',
        severity: overloaded.length > 3 ? 'critical' : 'high',
        message: `${overloaded.length} employee(s) show signs of overload and elevated burnout risk`,
        affectedCount: overloaded.length
      });
    }

    if (delayed.length > 0) {
      const critical = delayed.filter(p => p.completion_pct < 50);
      if (critical.length > 0) {
        alerts.push({
          type: 'project_delay',
          severity: 'high',
          message: `${critical.length} project(s) are at risk of significant delay`,
          affectedCount: critical.length
        });
      }
    }

    return alerts;
  }

  static _generateOrgRecommendations(bottlenecks, overloaded, delayed) {
    const recs = [];

    if (bottlenecks.length > 0) {
      recs.push('Redistribute tasks from bottleneck employees to balance workload across the team');
    }
    if (overloaded.length > 0) {
      recs.push('Implement mandatory rest periods and review task assignments for high-burnout employees');
    }
    if (delayed.length > 0) {
      recs.push('Conduct project health reviews and consider scope adjustments for at-risk projects');
    }
    if (bottlenecks.length === 0 && overloaded.length === 0) {
      recs.push('Organization is operating efficiently — maintain current team structures');
    }

    return recs;
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

module.exports = OrgInsightAgent;
