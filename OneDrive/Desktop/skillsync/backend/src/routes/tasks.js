const express = require('express');
const { query, withTransaction } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { dataCache, CachePilot } = require('../utils/cache');
const { upsertContributionEmbedding } = require('../db/chroma');
const SkillExtractionAgent = require('../agents/skillExtractionAgent');
const router = express.Router();

// GET /api/tasks - Get tasks for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, projectId, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const isManager = ['manager', 'admin'].includes(req.user.role_name);

    let params = [];
    let conditions = [];

    if (!isManager) {
      params.push(req.userId);
      conditions.push(`ta.user_id = $${params.length}`);
    }
    if (status) { params.push(status); conditions.push(`t.status = $${params.length}`); }
    if (projectId) { params.push(projectId); conditions.push(`t.project_id = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`t.priority = $${params.length}`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT t.*,
              p.title as project_title,
              m.title as milestone_title,
              json_agg(DISTINCT jsonb_build_object(
                'id', u.id, 'name', u.first_name || ' ' || u.last_name, 'avatar', u.avatar_url
              )) FILTER (WHERE u.id IS NOT NULL) as assignees
       FROM tasks t
       ${isManager ? '' : 'JOIN task_assignments ta ON t.id = ta.task_id'}
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN milestones m ON t.milestone_id = m.id
       LEFT JOIN task_assignments ta2 ON t.id = ta2.task_id
       LEFT JOIN users u ON ta2.user_id = u.id
       ${whereClause}
       GROUP BY t.id, p.title, m.title
       ORDER BY t.deadline ASC NULLS LAST, t.priority DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks
router.post('/', authenticate, authorize('manager', 'admin'), validate(schemas.createTask), async (req, res, next) => {
  try {
    const { projectId, milestoneId, title, description, priority, skillTags, deadline, estimatedHours, assigneeIds, parentTaskId } = req.body;

    const result = await withTransaction(async (client) => {
      const taskResult = await client.query(
        `INSERT INTO tasks (project_id, milestone_id, title, description, priority, skill_tags, deadline, estimated_hours, parent_task_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [projectId, milestoneId, title, description, priority, JSON.stringify(skillTags || []), deadline, estimatedHours, parentTaskId, req.userId]
      );
      const task = taskResult.rows[0];

      if (assigneeIds && assigneeIds.length > 0) {
        for (let i = 0; i < assigneeIds.length; i++) {
          await client.query(
            'INSERT INTO task_assignments (task_id, user_id, assigned_by, is_primary) VALUES ($1, $2, $3, $4)',
            [task.id, assigneeIds[i], req.userId, i === 0]
          );
        }
      }

      return task;
    });

    // Notify assignees via Socket.IO
    const io = req.app.get('io');
    if (io && assigneeIds) {
      assigneeIds.forEach(uid => {
        io.to(`user:${uid}`).emit('task_assigned', {
          taskId: result.id,
          title: result.title,
          priority: result.priority,
          deadline: result.deadline
        });
      });
    }

    dataCache.del(`tasks:project:${projectId}*`);
    res.status(201).json({ task: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('task', req.params.id);
    const { data: task } = await dataCache.getOrCompute(cacheKey, async () => {
      const result = await query(
        `SELECT t.*,
                p.title as project_title,
                json_agg(DISTINCT jsonb_build_object(
                  'id', u.id, 'name', u.first_name || ' ' || u.last_name,
                  'avatar', u.avatar_url, 'isPrimary', ta.is_primary
                )) FILTER (WHERE u.id IS NOT NULL) as assignees,
                json_agg(DISTINCT jsonb_build_object(
                  'id', c.id, 'content', c.content, 'type', c.contribution_type,
                  'createdAt', c.created_at, 'userId', c.user_id,
                  'userName', cu.first_name || ' ' || cu.last_name
                )) FILTER (WHERE c.id IS NOT NULL) as contributions
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         LEFT JOIN users u ON ta.user_id = u.id
         LEFT JOIN contributions c ON t.id = c.task_id
         LEFT JOIN users cu ON c.user_id = cu.id
         WHERE t.id = $1
         GROUP BY t.id, p.title`,
        [req.params.id]
      );
      return result.rows[0];
    }, 30);

    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', authenticate, validate(schemas.updateTaskStatus), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });

    dataCache.del(CachePilot.buildKey('task', req.params.id));

    // Real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${result.rows[0].project_id}`).emit('task_updated', {
        taskId: req.params.id,
        status,
        updatedBy: req.userId
      });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/contributions
router.post('/:id/contributions', authenticate, async (req, res, next) => {
  try {
    const { content, contributionType = 'comment' } = req.body;

    const result = await query(
      `INSERT INTO contributions (task_id, user_id, content, contribution_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.userId, content, contributionType]
    );

    // Get task info for embedding
    const taskResult = await query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    const task = taskResult.rows[0];

    // Async: embed contribution for skill extraction
    if (task) {
      setImmediate(async () => {
        try {
          await upsertContributionEmbedding(req.params.id, {
            title: task.title,
            description: content,
            tags: task.skill_tags,
            employeeId: req.userId,
            projectId: task.project_id
          });

          // Trigger skill extraction agent
          await SkillExtractionAgent.extractFromContribution({
            userId: req.userId,
            content,
            taskTitle: task.title,
            skillTags: task.skill_tags
          });
        } catch (err) {
          // Non-blocking
        }
      });
    }

    dataCache.del(CachePilot.buildKey('task', req.params.id));
    res.status(201).json({ contribution: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/position (Kanban drag-drop)
router.patch('/:id/position', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { position, status } = req.body;
    await query(
      'UPDATE tasks SET position = $1, status = COALESCE($2, status), updated_at = NOW() WHERE id = $3',
      [position, status, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
