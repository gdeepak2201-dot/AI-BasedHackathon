/**
 * AI Agent 2: Team Chemistry Agent
 * Analyzes collaboration history, peer reviews, and productivity patterns
 * to recommend optimal team combinations using Neo4j graph data.
 */
const { query } = require('../db/postgres');
const { getTeamChemistry, getBestTeamRecommendations, getCollaborationNetwork } = require('../db/neo4j');
const { aiCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

class TeamChemistryAgent {
  /**
   * Analyze chemistry for an existing project team
   */
  static async analyzeProjectTeam(projectId) {
    const startTime = Date.now();
    try {
      // Get team members
      const membersResult = await query(
        `SELECT pm.user_id, u.first_name || ' ' || u.last_name as name,
                u.skills, u.avatar_url, d.name as department
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE pm.project_id = $1`,
        [projectId]
      );

      const members = membersResult.rows;
      if (members.length < 2) {
        return { score: 0, message: 'Not enough team members for chemistry analysis', members };
      }

      const memberIds = members.map(m => m.user_id);

      // Get peer review scores between team members
      const peerScores = await query(
        `SELECT reviewer_id, reviewee_id, overall_score, collaboration_score, communication_score
         FROM peer_reviews
         WHERE reviewer_id = ANY($1) AND reviewee_id = ANY($1)
         ORDER BY created_at DESC`,
        [memberIds]
      );

      // Get collaboration data from Neo4j
      let graphChemistry = { records: [] };
      try {
        graphChemistry = await getTeamChemistry(memberIds);
      } catch (err) {
        logger.warn('Neo4j unavailable for team chemistry, using PostgreSQL fallback');
      }

      // Calculate chemistry score
      const chemistryScore = this._calculateChemistryScore(peerScores.rows, graphChemistry.records, members.length);

      // Identify compatibility pairs
      const compatibilityMatrix = this._buildCompatibilityMatrix(members, peerScores.rows);

      // Identify potential conflicts
      const conflicts = this._identifyConflicts(compatibilityMatrix);

      // Skill coverage analysis
      const skillCoverage = this._analyzeSkillCoverage(members);

      const result = {
        projectId,
        teamSize: members.length,
        members,
        chemistryScore: Math.round(chemistryScore * 100) / 100,
        chemistryLevel: this._getChemistryLevel(chemistryScore),
        compatibilityMatrix,
        conflicts,
        skillCoverage,
        recommendations: this._generateRecommendations(chemistryScore, conflicts, skillCoverage),
        analyzedAt: new Date().toISOString()
      };

      await this._logAgentAction('team_chemistry', 'analyze_project', { projectId }, Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error('TeamChemistryAgent.analyzeProjectTeam error:', error);
      throw error;
    }
  }

  /**
   * Recommend optimal team for a new project
   */
  static async recommendTeam(requiredSkills = [], teamSize = 5, projectId = null) {
    const startTime = Date.now();
    try {
      // Get candidates from PostgreSQL
      const candidates = await query(
        `SELECT u.id, u.first_name || ' ' || u.last_name as name,
                u.skills, u.avatar_url, d.name as department,
                wl.burnout_risk_score,
                (SELECT COUNT(*) FROM task_assignments ta 
                 JOIN tasks t ON ta.task_id = t.id 
                 WHERE ta.user_id = u.id AND t.status NOT IN ('completed')) as active_tasks,
                (SELECT AVG(overall_score) FROM peer_reviews WHERE reviewee_id = u.id) as avg_peer_score
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN workload_logs wl ON u.id = wl.user_id 
           AND wl.week_start = DATE_TRUNC('week', CURRENT_DATE)
         WHERE u.is_active = TRUE
         AND (wl.burnout_risk_score IS NULL OR wl.burnout_risk_score < 0.7)
         ORDER BY avg_peer_score DESC NULLS LAST`,
      );

      // Score each candidate
      const scoredCandidates = candidates.rows.map(candidate => {
        const skillMatch = this._calculateSkillMatch(candidate.skills || [], requiredSkills);
        const workloadScore = 1 - Math.min(1, (candidate.active_tasks || 0) / 10);
        const peerScore = (candidate.avg_peer_score || 3) / 5;
        const burnoutPenalty = candidate.burnout_risk_score || 0;

        const totalScore = (skillMatch * 0.4) + (workloadScore * 0.3) + (peerScore * 0.2) + ((1 - burnoutPenalty) * 0.1);

        return { ...candidate, scores: { skillMatch, workloadScore, peerScore, burnoutPenalty, total: totalScore } };
      });

      // Sort by score and select top candidates
      scoredCandidates.sort((a, b) => b.scores.total - a.scores.total);

      // Ensure skill diversity in final team
      const selectedTeam = this._selectDiverseTeam(scoredCandidates, requiredSkills, teamSize);

      // Get Neo4j chemistry for selected team
      let teamChemistry = null;
      if (selectedTeam.length >= 2) {
        try {
          const chemResult = await getTeamChemistry(selectedTeam.map(m => m.id));
          teamChemistry = chemResult.records.length > 0 ? 'Has collaboration history' : 'New team combination';
        } catch (err) { /* Neo4j optional */ }
      }

      const result = {
        recommendedTeam: selectedTeam,
        alternativeCandidates: scoredCandidates.slice(teamSize, teamSize + 5),
        skillCoverage: this._analyzeSkillCoverage(selectedTeam),
        teamChemistryNote: teamChemistry,
        requiredSkills,
        coveragePercentage: this._calculateCoveragePercentage(selectedTeam, requiredSkills)
      };

      await this._logAgentAction('team_chemistry', 'recommend_team', { teamSize, skillCount: requiredSkills.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error('TeamChemistryAgent.recommendTeam error:', error);
      throw error;
    }
  }

  // Private helpers
  static _calculateChemistryScore(peerReviews, graphRecords, teamSize) {
    if (peerReviews.length === 0) return 0.5; // Neutral if no data

    const avgPeerScore = peerReviews.reduce((sum, r) => sum + parseFloat(r.overall_score || 0), 0) / peerReviews.length;
    const avgCollabScore = peerReviews.reduce((sum, r) => sum + parseFloat(r.collaboration_score || 0), 0) / peerReviews.length;

    // Normalize to 0-1
    const peerComponent = (avgPeerScore / 5) * 0.6 + (avgCollabScore / 5) * 0.4;

    // Graph component (if available)
    let graphComponent = 0.5;
    if (graphRecords.length > 0) {
      const avgWeight = graphRecords.reduce((sum, r) => sum + (r.get('avgWeight') || 0), 0) / graphRecords.length;
      graphComponent = Math.min(1, avgWeight / 10);
    }

    return peerComponent * 0.7 + graphComponent * 0.3;
  }

  static _buildCompatibilityMatrix(members, peerReviews) {
    const matrix = {};
    members.forEach(m1 => {
      matrix[m1.user_id] = {};
      members.forEach(m2 => {
        if (m1.user_id !== m2.user_id) {
          const review = peerReviews.find(r =>
            (r.reviewer_id === m1.user_id && r.reviewee_id === m2.user_id) ||
            (r.reviewer_id === m2.user_id && r.reviewee_id === m1.user_id)
          );
          matrix[m1.user_id][m2.user_id] = review ? parseFloat(review.overall_score) : null;
        }
      });
    });
    return matrix;
  }

  static _identifyConflicts(matrix) {
    const conflicts = [];
    Object.entries(matrix).forEach(([emp1, scores]) => {
      Object.entries(scores).forEach(([emp2, score]) => {
        if (score !== null && score < 2.5) {
          conflicts.push({ emp1, emp2, score, severity: score < 2 ? 'high' : 'medium' });
        }
      });
    });
    return conflicts;
  }

  static _analyzeSkillCoverage(members) {
    const allSkills = members.flatMap(m => m.skills || []);
    const uniqueSkills = [...new Set(allSkills)];
    const skillFrequency = {};
    allSkills.forEach(s => { skillFrequency[s] = (skillFrequency[s] || 0) + 1; });
    return { uniqueSkills, skillFrequency, totalSkills: uniqueSkills.length };
  }

  static _calculateSkillMatch(candidateSkills, requiredSkills) {
    if (!requiredSkills.length) return 0.5;
    const matches = requiredSkills.filter(rs =>
      candidateSkills.some(cs => cs.toLowerCase().includes(rs.toLowerCase()))
    );
    return matches.length / requiredSkills.length;
  }

  static _selectDiverseTeam(candidates, requiredSkills, teamSize) {
    const selected = [];
    const coveredSkills = new Set();

    for (const candidate of candidates) {
      if (selected.length >= teamSize) break;

      const newSkills = (candidate.skills || []).filter(s => !coveredSkills.has(s));
      if (newSkills.length > 0 || selected.length < Math.ceil(teamSize / 2)) {
        selected.push(candidate);
        (candidate.skills || []).forEach(s => coveredSkills.add(s));
      }
    }

    // Fill remaining slots with top scorers
    for (const candidate of candidates) {
      if (selected.length >= teamSize) break;
      if (!selected.find(s => s.id === candidate.id)) {
        selected.push(candidate);
      }
    }

    return selected;
  }

  static _calculateCoveragePercentage(team, requiredSkills) {
    if (!requiredSkills.length) return 100;
    const allTeamSkills = team.flatMap(m => m.skills || []).map(s => s.toLowerCase());
    const covered = requiredSkills.filter(rs => allTeamSkills.some(ts => ts.includes(rs.toLowerCase())));
    return Math.round((covered.length / requiredSkills.length) * 100);
  }

  static _getChemistryLevel(score) {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Moderate';
    return 'Needs Improvement';
  }

  static _generateRecommendations(score, conflicts, skillCoverage) {
    const recs = [];
    if (score < 0.5) recs.push('Consider team-building activities to improve collaboration');
    if (conflicts.length > 0) recs.push(`Address ${conflicts.length} compatibility concern(s) between team members`);
    if (skillCoverage.totalSkills < 5) recs.push('Consider adding members with diverse skill sets');
    if (score >= 0.8) recs.push('This team has excellent chemistry - maintain current composition');
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

module.exports = TeamChemistryAgent;
