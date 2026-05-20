/**
 * AI Agent 1: Skill Extraction Agent
 * Uses NLP to discover hidden and evolving employee skills from contributions,
 * peer reviews, task descriptions, and commit-style text.
 * Implements late chunking for efficient embedding storage.
 */
const { query } = require('../db/postgres');
const { upsertSkillEmbedding, querySkillSimilarity, lateChunkText } = require('../db/chroma');
const { aiCache, CachePilot } = require('../utils/cache');
const logger = require('../utils/logger');

// Skill taxonomy with semantic groupings
const SKILL_TAXONOMY = {
  frontend: ['react', 'vue', 'angular', 'typescript', 'javascript', 'css', 'html', 'tailwind', 'next.js', 'redux', 'graphql'],
  backend: ['node.js', 'python', 'java', 'go', 'rust', 'express', 'django', 'spring', 'fastapi', 'postgresql', 'mongodb'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'terraform', 'ansible', 'jenkins', 'github actions'],
  data: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'sql', 'tableau', 'power bi', 'spark'],
  soft: ['leadership', 'communication', 'problem solving', 'teamwork', 'mentoring', 'project management', 'agile', 'scrum'],
  security: ['cybersecurity', 'penetration testing', 'oauth', 'jwt', 'encryption', 'soc', 'compliance'],
  mobile: ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios', 'expo']
};

const ALL_SKILLS = Object.values(SKILL_TAXONOMY).flat();

class SkillExtractionAgent {
  /**
   * Extract skills from a single contribution using NLP pattern matching
   * and semantic similarity (late chunking approach)
   */
  static async extractFromContribution({ userId, content, taskTitle, skillTags = [] }) {
    const startTime = Date.now();
    try {
      const extractedSkills = this._extractSkillsFromText(`${taskTitle} ${content}`);
      const combinedSkills = [...new Set([...extractedSkills, ...skillTags])];

      if (combinedSkills.length > 0) {
        // Store with late chunking - embed full context, not just skill names
        await upsertSkillEmbedding(userId, {
          skills: combinedSkills,
          context: `${taskTitle}: ${content.substring(0, 200)}`,
          source: 'contribution'
        });

        // Update user skills in PostgreSQL
        await this._updateUserSkills(userId, combinedSkills);
      }

      await this._logAgentAction('skill_extraction', 'extract_contribution', { userId, skillCount: combinedSkills.length }, Date.now() - startTime);
      return { extractedSkills: combinedSkills };
    } catch (error) {
      logger.error('SkillExtractionAgent.extractFromContribution error:', error);
      return { extractedSkills: [] };
    }
  }

  /**
   * Full skill profile extraction for a user
   * Analyzes all contributions, peer reviews, and task history
   */
  static async fullExtraction(userId) {
    const startTime = Date.now();
    try {
      // Gather all text sources
      const [contributions, peerReviews, taskHistory] = await Promise.all([
        query(
          `SELECT c.content, t.title, t.skill_tags 
           FROM contributions c 
           JOIN tasks t ON c.task_id = t.id 
           WHERE c.user_id = $1 
           ORDER BY c.created_at DESC LIMIT 50`,
          [userId]
        ),
        query(
          `SELECT feedback, communication_score, leadership_score, technical_score
           FROM peer_reviews WHERE reviewee_id = $1 ORDER BY created_at DESC LIMIT 20`,
          [userId]
        ),
        query(
          `SELECT t.title, t.description, t.skill_tags, t.status
           FROM tasks t
           JOIN task_assignments ta ON t.id = ta.task_id
           WHERE ta.user_id = $1 AND t.status = 'completed'
           ORDER BY t.updated_at DESC LIMIT 30`,
          [userId]
        )
      ]);

      const allText = [
        ...contributions.rows.map(c => `${c.title} ${c.content}`),
        ...peerReviews.rows.map(r => r.feedback || ''),
        ...taskHistory.rows.map(t => `${t.title} ${t.description || ''}`)
      ].join(' ');

      // Extract skills from combined text
      const extractedSkills = this._extractSkillsFromText(allText);

      // Extract from skill_tags arrays
      const tagSkills = [
        ...contributions.rows.flatMap(c => c.skill_tags || []),
        ...taskHistory.rows.flatMap(t => t.skill_tags || [])
      ];

      // Detect leadership indicators from peer reviews
      const leadershipIndicators = this._detectLeadershipIndicators(peerReviews.rows);

      const allSkills = [...new Set([...extractedSkills, ...tagSkills, ...leadershipIndicators])];

      // Store embeddings with late chunking
      const chunks = lateChunkText(allText, 512, 64);
      for (const chunk of chunks.slice(0, 5)) { // Limit to 5 chunks per user
        await upsertSkillEmbedding(userId, {
          skills: allSkills,
          context: chunk,
          source: 'full_extraction'
        });
      }

      // Update PostgreSQL
      await this._updateUserSkills(userId, allSkills);

      // Invalidate cache
      aiCache.del(CachePilot.buildKey('ai_skills', userId));

      const result = {
        userId,
        extractedSkills: allSkills,
        skillsByCategory: this._categorizeSkills(allSkills),
        leadershipIndicators,
        totalContributions: contributions.rows.length,
        completedTasks: taskHistory.rows.length,
        peerReviewCount: peerReviews.rows.length
      };

      await this._logAgentAction('skill_extraction', 'full_extraction', { userId, skillCount: allSkills.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error('SkillExtractionAgent.fullExtraction error:', error);
      throw error;
    }
  }

  /**
   * Get complete skill profile for a user
   */
  static async getSkillProfile(userId) {
    const [userResult, skillHistory] = await Promise.all([
      query(
        `SELECT skills, first_name, last_name FROM users WHERE id = $1`,
        [userId]
      ),
      query(
        `SELECT DISTINCT unnest(skill_tags::text[]) as skill, COUNT(*) as frequency
         FROM tasks t
         JOIN task_assignments ta ON t.id = ta.task_id
         WHERE ta.user_id = $1 AND t.status = 'completed'
         GROUP BY skill ORDER BY frequency DESC LIMIT 20`,
        [userId]
      )
    ]);

    const user = userResult.rows[0];
    const declaredSkills = user?.skills || [];
    const taskSkills = skillHistory.rows;

    // Find hidden skills (in tasks but not declared)
    const hiddenSkills = taskSkills
      .filter(ts => !declaredSkills.includes(ts.skill))
      .map(ts => ({ skill: ts.skill, frequency: parseInt(ts.frequency), source: 'task_history' }));

    return {
      declaredSkills,
      taskDerivedSkills: taskSkills,
      hiddenSkills,
      skillsByCategory: this._categorizeSkills(declaredSkills),
      growthTrend: await this._getSkillGrowthTrend(userId)
    };
  }

  /**
   * Build skill graph for visualization
   */
  static async buildSkillGraph(userId) {
    const profile = await this.getSkillProfile(userId);
    const nodes = [];
    const edges = [];

    // Central node
    nodes.push({ id: userId, type: 'user', label: 'You', size: 30 });

    // Category nodes
    const categories = Object.keys(SKILL_TAXONOMY);
    categories.forEach(cat => {
      const catSkills = profile.declaredSkills.filter(s =>
        SKILL_TAXONOMY[cat].includes(s.toLowerCase())
      );
      if (catSkills.length > 0) {
        nodes.push({ id: `cat_${cat}`, type: 'category', label: cat, size: 20 });
        edges.push({ source: userId, target: `cat_${cat}`, weight: catSkills.length });

        catSkills.forEach(skill => {
          nodes.push({ id: `skill_${skill}`, type: 'skill', label: skill, size: 10 });
          edges.push({ source: `cat_${cat}`, target: `skill_${skill}`, weight: 1 });
        });
      }
    });

    // Hidden skills
    profile.hiddenSkills.slice(0, 5).forEach(hs => {
      nodes.push({ id: `hidden_${hs.skill}`, type: 'hidden_skill', label: hs.skill, size: 8 });
      edges.push({ source: userId, target: `hidden_${hs.skill}`, weight: hs.frequency, dashed: true });
    });

    return { nodes, edges, profile };
  }

  // Private helpers
  static _extractSkillsFromText(text) {
    if (!text) return [];
    const lowerText = text.toLowerCase();
    return ALL_SKILLS.filter(skill => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  static _detectLeadershipIndicators(peerReviews) {
    const indicators = [];
    const avgLeadership = peerReviews.reduce((sum, r) => sum + (r.leadership_score || 0), 0) / (peerReviews.length || 1);

    if (avgLeadership >= 4) indicators.push('leadership');
    if (avgLeadership >= 4.5) indicators.push('mentoring');

    const feedbackText = peerReviews.map(r => r.feedback || '').join(' ').toLowerCase();
    if (feedbackText.includes('mentor') || feedbackText.includes('guide')) indicators.push('mentoring');
    if (feedbackText.includes('initiative') || feedbackText.includes('proactive')) indicators.push('initiative');
    if (feedbackText.includes('innovat')) indicators.push('innovation');

    return indicators;
  }

  static _categorizeSkills(skills) {
    const categorized = {};
    skills.forEach(skill => {
      for (const [category, categorySkills] of Object.entries(SKILL_TAXONOMY)) {
        if (categorySkills.includes(skill.toLowerCase())) {
          if (!categorized[category]) categorized[category] = [];
          categorized[category].push(skill);
          break;
        }
      }
    });
    return categorized;
  }

  static async _updateUserSkills(userId, newSkills) {
    if (!newSkills.length) return;
    await query(
      `UPDATE users SET 
         skills = (
           SELECT jsonb_agg(DISTINCT skill)
           FROM (
             SELECT jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) as skill
             UNION
             SELECT unnest($1::text[]) as skill
           ) combined
         ),
         updated_at = NOW()
       WHERE id = $2`,
      [newSkills, userId]
    );
  }

  static async _getSkillGrowthTrend(userId) {
    const result = await query(
      `SELECT DATE_TRUNC('month', t.updated_at) as month,
              array_agg(DISTINCT unnest) as skills_used
       FROM tasks t
       JOIN task_assignments ta ON t.id = ta.task_id,
       LATERAL unnest(t.skill_tags::text[]) as unnest
       WHERE ta.user_id = $1 AND t.status = 'completed'
       AND t.updated_at > NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month`,
      [userId]
    );
    return result.rows;
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

module.exports = SkillExtractionAgent;
