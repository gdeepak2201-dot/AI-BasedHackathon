/**
 * AI Agent 5: Compensation Intelligence Agent
 * Analyzes performance metrics to suggest promotions, increments, and reviews.
 * Uses constructive, growth-oriented language.
 */
const { query } = require('../db/postgres');
const { aiCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

class CompensationAgent {
  /**
   * Generate compensation suggestion for an employee
   */
  static async generateSuggestion(userId) {
    const startTime = Date.now();
    try {
      const [userInfo, taskMetrics, peerMetrics, timeMetrics, burnoutData] = await Promise.all([
        query(
          `SELECT u.first_name, u.last_name, u.hire_date, u.skills, r.name as role, d.name as department
           FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id
           WHERE u.id = $1`,
          [userId]
        ),
        query(
          `SELECT 
             COUNT(*) as total_tasks,
             COUNT(*) FILTER (WHERE t.status = 'completed') as completed_tasks,
             COUNT(*) FILTER (WHERE t.status = 'completed' AND t.updated_at <= t.deadline) as on_time_tasks,
             COUNT(*) FILTER (WHERE t.priority IN ('high', 'critical') AND t.status = 'completed') as high_priority_completed,
             AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) FILTER (WHERE t.status = 'completed') as avg_completion_hours
           FROM tasks t
           JOIN task_assignments ta ON t.id = ta.task_id
           WHERE ta.user_id = $1 AND t.created_at >= NOW() - INTERVAL '6 months'`,
          [userId]
        ),
        query(
          `SELECT 
             AVG(overall_score) as avg_overall,
             AVG(leadership_score) as avg_leadership,
             AVG(technical_score) as avg_technical,
             AVG(collaboration_score) as avg_collaboration,
             COUNT(*) as review_count
           FROM peer_reviews WHERE reviewee_id = $1`,
          [userId]
        ),
        query(
          `SELECT 
             AVG(productivity_score) as avg_productivity,
             SUM(overtime_minutes) as total_overtime,
             COUNT(*) as days_logged
           FROM active_time_logs
           WHERE user_id = $1 AND date >= NOW() - INTERVAL '90 days'`,
          [userId]
        ),
        query(
          `SELECT burnout_risk_score FROM workload_logs 
           WHERE user_id = $1 ORDER BY week_start DESC LIMIT 1`,
          [userId]
        )
      ]);

      const user = userInfo.rows[0];
      const tasks = taskMetrics.rows[0];
      const peers = peerMetrics.rows[0];
      const time = timeMetrics.rows[0];
      const burnout = burnoutData.rows[0];

      if (!user) throw new Error('User not found');

      // Calculate component scores (0-1)
      const scores = {
        taskQuality: this._calculateTaskQualityScore(tasks),
        productivity: parseFloat(time.avg_productivity) || 0.5,
        peerReview: (parseFloat(peers.avg_overall) || 3) / 5,
        leadership: (parseFloat(peers.avg_leadership) || 3) / 5,
        collaboration: (parseFloat(peers.avg_collaboration) || 3) / 5,
        innovation: this._calculateInnovationScore(tasks, user.skills),
        burnoutContribution: 1 - (parseFloat(burnout?.burnout_risk_score) || 0.3)
      };

      // Weighted overall score
      const overallScore = (
        scores.taskQuality * 0.25 +
        scores.productivity * 0.20 +
        scores.peerReview * 0.20 +
        scores.leadership * 0.15 +
        scores.collaboration * 0.10 +
        scores.innovation * 0.05 +
        scores.burnoutContribution * 0.05
      );

      const tenureMonths = this._calculateTenureMonths(user.hire_date);
      const suggestion = this._determineSuggestion(overallScore, scores, tenureMonths);

      // Save to database
      const result = await query(
        `INSERT INTO compensation_suggestions 
         (user_id, suggestion_type, performance_score, productivity_score, collaboration_score, 
          innovation_score, overall_score, rationale)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          userId,
          suggestion.type,
          scores.taskQuality,
          scores.productivity,
          scores.collaboration,
          scores.innovation,
          overallScore,
          suggestion.rationale
        ]
      );

      const output = {
        userId,
        employee: `${user.first_name} ${user.last_name}`,
        role: user.role,
        department: user.department,
        tenureMonths,
        scores,
        overallScore: Math.round(overallScore * 100) / 100,
        suggestion,
        dataPoints: {
          completedTasks: parseInt(tasks.completed_tasks) || 0,
          onTimeTasks: parseInt(tasks.on_time_tasks) || 0,
          peerReviewCount: parseInt(peers.review_count) || 0,
          avgProductivity: Math.round((parseFloat(time.avg_productivity) || 0) * 100)
        },
        generatedAt: new Date().toISOString()
      };

      await this._logAgentAction('compensation', 'generate_suggestion', { userId, overallScore }, Date.now() - startTime);
      return output;
    } catch (error) {
      logger.error('CompensationAgent.generateSuggestion error:', error);
      throw error;
    }
  }

  // Private helpers
  static _calculateTaskQualityScore(tasks) {
    const total = parseInt(tasks.total_tasks) || 0;
    const completed = parseInt(tasks.completed_tasks) || 0;
    const onTime = parseInt(tasks.on_time_tasks) || 0;
    const highPriority = parseInt(tasks.high_priority_completed) || 0;

    if (total === 0) return 0.5;

    const completionRate = completed / total;
    const onTimeRate = completed > 0 ? onTime / completed : 0;
    const highPriorityBonus = Math.min(0.2, highPriority * 0.05);

    return Math.min(1, completionRate * 0.5 + onTimeRate * 0.3 + highPriorityBonus + 0.2);
  }

  static _calculateInnovationScore(tasks, skills) {
    const skillCount = (skills || []).length;
    const highPriorityTasks = parseInt(tasks.high_priority_completed) || 0;
    return Math.min(1, (skillCount / 10) * 0.5 + (highPriorityTasks / 10) * 0.5);
  }

  static _calculateTenureMonths(hireDate) {
    if (!hireDate) return 0;
    const hire = new Date(hireDate);
    const now = new Date();
    return Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 30));
  }

  static _determineSuggestion(overallScore, scores, tenureMonths) {
    if (overallScore >= 0.85 && tenureMonths >= 12) {
      return {
        type: 'promotion',
        title: 'Promotion Readiness',
        message: 'This employee demonstrates exceptional performance and is ready for advancement.',
        rationale: `Outstanding overall performance score of ${Math.round(overallScore * 100)}%. Strong task quality, peer recognition, and consistent productivity make this employee an excellent candidate for promotion.`,
        urgency: 'high',
        actionItems: ['Schedule promotion discussion', 'Review compensation benchmarks', 'Define new role responsibilities']
      };
    } else if (overallScore >= 0.70) {
      return {
        type: 'increment',
        title: 'Compensation Review Recommendation',
        message: 'Strong performance warrants a compensation review and potential increment.',
        rationale: `Performance score of ${Math.round(overallScore * 100)}% reflects consistent delivery and positive team impact. A merit-based increment would recognize and reinforce this trajectory.`,
        urgency: 'medium',
        actionItems: ['Review current compensation vs. market rate', 'Discuss career growth path', 'Set stretch goals for next cycle']
      };
    } else if (overallScore >= 0.50) {
      return {
        type: 'development',
        title: 'Growth & Development Plan',
        message: 'Employee shows potential with targeted areas for professional development.',
        rationale: `Current performance score of ${Math.round(overallScore * 100)}% indicates solid foundational work with opportunities to grow. A structured development plan will help unlock full potential.`,
        urgency: 'low',
        actionItems: ['Create personalized development plan', 'Identify skill gaps and training opportunities', 'Schedule regular check-ins']
      };
    } else {
      return {
        type: 'performance_improvement',
        title: 'Performance Improvement Suggestion',
        message: 'A supportive performance improvement plan is recommended to help this employee succeed.',
        rationale: `Performance indicators suggest the employee may benefit from additional support and clearer goal-setting. This is an opportunity to identify blockers and provide targeted assistance.`,
        urgency: 'high',
        actionItems: ['Schedule 1:1 to understand challenges', 'Create clear, achievable short-term goals', 'Provide mentoring or additional resources', 'Review workload for potential burnout factors']
      };
    }
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

module.exports = CompensationAgent;
