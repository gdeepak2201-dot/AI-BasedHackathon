const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { aiCache, CachePilot } = require('../utils/cache');
const SkillExtractionAgent = require('../agents/skillExtractionAgent');
const TeamChemistryAgent = require('../agents/teamChemistryAgent');
const BurnoutAgent = require('../agents/burnoutAgent');
const CompensationAgent = require('../agents/compensationAgent');
const OrgInsightAgent = require('../agents/orgInsightAgent');
const { query } = require('../db/postgres');
const router = express.Router();

// GET /api/ai/skills/:userId - Get AI-extracted skills
router.get('/skills/:userId', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    const isSelf = req.params.userId === req.userId;
    if (!isManager && !isSelf) return res.status(403).json({ error: 'Access denied' });

    const cacheKey = CachePilot.buildKey('ai_skills', req.params.userId);
    const { data, fromCache } = await aiCache.getOrCompute(cacheKey, async () => {
      return await SkillExtractionAgent.getSkillProfile(req.params.userId);
    }, 600);

    res.json({ skills: data, cached: fromCache });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/skills/:userId/extract - Trigger skill extraction
router.post('/skills/:userId/extract', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    aiCache.del(CachePilot.buildKey('ai_skills', req.params.userId));
    const result = await SkillExtractionAgent.fullExtraction(req.params.userId);
    res.json({ result, message: 'Skill extraction completed' });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/team-chemistry/:projectId
router.get('/team-chemistry/:projectId', authenticate, async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('team_chemistry', req.params.projectId);
    const { data, fromCache } = await aiCache.getOrCompute(cacheKey, async () => {
      return await TeamChemistryAgent.analyzeProjectTeam(req.params.projectId);
    }, 300);

    res.json({ chemistry: data, cached: fromCache });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/team-recommendations - Get optimal team for a project
router.post('/team-recommendations', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { requiredSkills, teamSize, projectId } = req.body;
    const cacheKey = CachePilot.buildKey('team_rec', projectId, requiredSkills?.join('-'), teamSize);

    const { data } = await aiCache.getOrCompute(cacheKey, async () => {
      return await TeamChemistryAgent.recommendTeam(requiredSkills, teamSize, projectId);
    }, 300);

    res.json({ recommendations: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/burnout/:userId
router.get('/burnout/:userId', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    const isSelf = req.params.userId === req.userId;
    if (!isManager && !isSelf) return res.status(403).json({ error: 'Access denied' });

    const cacheKey = CachePilot.buildKey('burnout', req.params.userId);
    const { data, fromCache } = await aiCache.getOrCompute(cacheKey, async () => {
      return await BurnoutAgent.getPrediction(req.params.userId);
    }, 300);

    res.json({ burnout: data, cached: fromCache });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/burnout-team - Team burnout overview
router.get('/burnout-team', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('burnout_team', req.userId);
    const { data } = await aiCache.getOrCompute(cacheKey, async () => {
      return await BurnoutAgent.getTeamBurnoutOverview(req.userId);
    }, 300);

    res.json({ teamBurnout: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/compensation/:userId
router.get('/compensation/:userId', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('compensation', req.params.userId);
    const { data, fromCache } = await aiCache.getOrCompute(cacheKey, async () => {
      return await CompensationAgent.generateSuggestion(req.params.userId);
    }, 3600);

    res.json({ compensation: data, cached: fromCache });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/compensation-team - All compensation suggestions
router.get('/compensation-team', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT cs.*, u.first_name, u.last_name, u.email, d.name as department
       FROM compensation_suggestions cs
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE cs.status = 'pending'
       ORDER BY cs.overall_score DESC`,
    );
    res.json({ suggestions: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/org-insights
router.get('/org-insights', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const cacheKey = 'org_insights';
    const { data, fromCache } = await aiCache.getOrCompute(cacheKey, async () => {
      return await OrgInsightAgent.generateInsights();
    }, 600);

    res.json({ insights: data, cached: fromCache });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/skill-graph/:userId
router.get('/skill-graph/:userId', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    const isSelf = req.params.userId === req.userId;
    if (!isManager && !isSelf) return res.status(403).json({ error: 'Access denied' });

    const cacheKey = CachePilot.buildKey('skill_graph', req.params.userId);
    const { data } = await aiCache.getOrCompute(cacheKey, async () => {
      return await SkillExtractionAgent.buildSkillGraph(req.params.userId);
    }, 600);

    res.json({ graph: data });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/run-all-agents - Admin trigger
router.post('/run-all-agents', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.body;

    // Run agents in parallel
    const [skills, burnout, compensation] = await Promise.allSettled([
      SkillExtractionAgent.fullExtraction(userId),
      BurnoutAgent.checkAndUpdateRisk(userId),
      CompensationAgent.generateSuggestion(userId)
    ]);

    res.json({
      results: {
        skillExtraction: skills.status === 'fulfilled' ? 'success' : skills.reason?.message,
        burnoutPrediction: burnout.status === 'fulfilled' ? 'success' : burnout.reason?.message,
        compensationAnalysis: compensation.status === 'fulfilled' ? 'success' : compensation.reason?.message
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
