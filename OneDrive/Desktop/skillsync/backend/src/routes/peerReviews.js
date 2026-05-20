const express = require('express');
const { query } = require('../db/postgres');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { dataCache, CachePilot } = require('../utils/cache');
const router = express.Router();

// POST /api/peer-reviews
router.post('/', authenticate, validate(schemas.peerReview), async (req, res, next) => {
  try {
    const { revieweeId, projectId, communicationScore, leadershipScore, collaborationScore, technicalScore, reliabilityScore, feedback, isAnonymous } = req.body;

    if (revieweeId === req.userId) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    // Check if already reviewed this period
    const existing = await query(
      `SELECT id FROM peer_reviews 
       WHERE reviewer_id = $1 AND reviewee_id = $2 
       AND project_id = $3
       AND created_at > NOW() - INTERVAL '30 days'`,
      [req.userId, revieweeId, projectId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this employee for this project this month' });
    }

    const overallScore = (communicationScore + leadershipScore + collaborationScore + technicalScore + reliabilityScore) / 5;

    const result = await query(
      `INSERT INTO peer_reviews 
       (reviewer_id, reviewee_id, project_id, communication_score, leadership_score, 
        collaboration_score, technical_score, reliability_score, overall_score, feedback, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.userId, revieweeId, projectId, communicationScore, leadershipScore, collaborationScore, technicalScore, reliabilityScore, overallScore, feedback, isAnonymous]
    );

    // Invalidate reviewee's cache
    dataCache.del(CachePilot.buildKey('user_reviews', revieweeId));

    res.status(201).json({ review: result.rows[0], message: 'Review submitted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/peer-reviews/my-reviews
router.get('/my-reviews', authenticate, async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('user_reviews', req.userId);
    const { data: reviews } = await dataCache.getOrCompute(cacheKey, async () => {
      const result = await query(
        `SELECT pr.*,
                CASE WHEN pr.is_anonymous THEN 'Anonymous' 
                     ELSE ru.first_name || ' ' || ru.last_name END as reviewer_name,
                p.title as project_title
         FROM peer_reviews pr
         LEFT JOIN users ru ON pr.reviewer_id = ru.id
         LEFT JOIN projects p ON pr.project_id = p.id
         WHERE pr.reviewee_id = $1
         ORDER BY pr.created_at DESC`,
        [req.userId]
      );

      const avgResult = await query(
        `SELECT 
           AVG(communication_score) as avg_communication,
           AVG(leadership_score) as avg_leadership,
           AVG(collaboration_score) as avg_collaboration,
           AVG(technical_score) as avg_technical,
           AVG(reliability_score) as avg_reliability,
           AVG(overall_score) as avg_overall,
           COUNT(*) as total_reviews
         FROM peer_reviews WHERE reviewee_id = $1`,
        [req.userId]
      );

      return { reviews: result.rows, averages: avgResult.rows[0] };
    }, 120);

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// GET /api/peer-reviews/user/:userId
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    const isManager = ['manager', 'admin'].includes(req.user.role_name);
    const isSelf = req.params.userId === req.userId;

    if (!isManager && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT 
         AVG(communication_score) as avg_communication,
         AVG(leadership_score) as avg_leadership,
         AVG(collaboration_score) as avg_collaboration,
         AVG(technical_score) as avg_technical,
         AVG(reliability_score) as avg_reliability,
         AVG(overall_score) as avg_overall,
         COUNT(*) as total_reviews,
         json_agg(jsonb_build_object(
           'id', pr.id,
           'reviewerName', CASE WHEN pr.is_anonymous THEN 'Anonymous' ELSE ru.first_name || ' ' || ru.last_name END,
           'scores', jsonb_build_object(
             'communication', pr.communication_score,
             'leadership', pr.leadership_score,
             'collaboration', pr.collaboration_score,
             'technical', pr.technical_score,
             'reliability', pr.reliability_score
           ),
           'feedback', pr.feedback,
           'createdAt', pr.created_at
         ) ORDER BY pr.created_at DESC) as reviews
       FROM peer_reviews pr
       LEFT JOIN users ru ON pr.reviewer_id = ru.id
       WHERE pr.reviewee_id = $1`,
      [req.params.userId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// GET /api/peer-reviews/pending - Reviews I need to submit
router.get('/pending', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.avatar_url, p.id as project_id, p.title as project_title
       FROM project_members pm1
       JOIN project_members pm2 ON pm1.project_id = pm2.project_id AND pm2.user_id != $1
       JOIN users u ON pm2.user_id = u.id
       JOIN projects p ON pm1.project_id = p.id
       WHERE pm1.user_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM peer_reviews pr 
         WHERE pr.reviewer_id = $1 AND pr.reviewee_id = u.id 
         AND pr.project_id = p.id
         AND pr.created_at > NOW() - INTERVAL '30 days'
       )
       AND p.status = 'active'
       LIMIT 10`,
      [req.userId]
    );

    res.json({ pendingReviews: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
