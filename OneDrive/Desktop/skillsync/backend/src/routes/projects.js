const express = require('express');
const { query, withTransaction } = require('../db/postgres');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { dataCache, CachePilot } = require('../utils/cache');
const { upsertEmployee, recordCollaboration } = require('../db/neo4j');
const router = express.Router();

// GET /api/projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;
    const isManager = ['manager', 'admin'].includes(req.user.role_name);

    let whereClause = isManager
      ? 'WHERE 1=1'
      : `WHERE pm.user_id = '${req.userId}'`;

    const params = [];
    if (status) { params.push(status); whereClause += ` AND p.status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); whereClause += ` AND p.title ILIKE $${params.length}`; }

    const baseQuery = isManager
      ? `SELECT p.*, u.first_name || ' ' || u.last_name as manager_name,
                d.name as department_name,
                COUNT(DISTINCT pm2.user_id) as member_count,
                COUNT(DISTINCT t.id) as task_count,
                COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
         FROM projects p
         LEFT JOIN users u ON p.manager_id = u.id
         LEFT JOIN departments d ON p.department_id = d.id
         LEFT JOIN project_members pm2 ON p.id = pm2.project_id
         LEFT JOIN tasks t ON p.id = t.project_id
         ${whereClause}
         GROUP BY p.id, u.first_name, u.last_name, d.name
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      : `SELECT p.*, u.first_name || ' ' || u.last_name as manager_name,
                d.name as department_name,
                COUNT(DISTINCT pm2.user_id) as member_count,
                COUNT(DISTINCT t.id) as task_count,
                COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
         FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         LEFT JOIN users u ON p.manager_id = u.id
         LEFT JOIN departments d ON p.department_id = d.id
         LEFT JOIN project_members pm2 ON p.id = pm2.project_id
         LEFT JOIN tasks t ON p.id = t.project_id
         ${whereClause}
         GROUP BY p.id, u.first_name, u.last_name, d.name
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(parseInt(limit), offset);
    const result = await query(baseQuery, params);

    const countResult = await query(
      isManager
        ? `SELECT COUNT(*) FROM projects p ${whereClause.replace(/\$\d+/g, (m) => m)}`
        : `SELECT COUNT(*) FROM projects p JOIN project_members pm ON p.id = pm.project_id ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      projects: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects
router.post('/', authenticate, authorize('manager', 'admin'), validate(schemas.createProject), async (req, res, next) => {
  try {
    const { title, description, departmentId, startDate, deadline, priority, tags, memberIds } = req.body;

    const result = await withTransaction(async (client) => {
      const projectResult = await client.query(
        `INSERT INTO projects (title, description, manager_id, department_id, start_date, deadline, priority, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [title, description, req.userId, departmentId, startDate, deadline, priority, JSON.stringify(tags || [])]
      );
      const project = projectResult.rows[0];

      // Add manager as member
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [project.id, req.userId, 'manager']
      );

      // Add team members
      if (memberIds && memberIds.length > 0) {
        for (const memberId of memberIds) {
          await client.query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [project.id, memberId, 'member']
          );
          // Update Neo4j collaboration graph
          await recordCollaboration(req.userId, memberId, project.id, 1);
        }
      }

      return project;
    });

    // Invalidate cache
    dataCache.del(`projects:${req.userId}*`);

    // Emit real-time notification
    const io = req.app.get('io');
    if (io && memberIds) {
      memberIds.forEach(memberId => {
        io.to(`user:${memberId}`).emit('notification', {
          type: 'project_assigned',
          title: 'New Project Assignment',
          message: `You've been added to project: ${title}`,
          data: { projectId: result.id }
        });
      });
    }

    res.status(201).json({ message: 'Project created', project: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const cacheKey = CachePilot.buildKey('project', req.params.id);
    const { data: project } = await dataCache.getOrCompute(cacheKey, async () => {
      const result = await query(
        `SELECT p.*,
                u.first_name || ' ' || u.last_name as manager_name,
                d.name as department_name,
                json_agg(DISTINCT jsonb_build_object(
                  'id', pm.user_id,
                  'name', mu.first_name || ' ' || mu.last_name,
                  'role', pm.role,
                  'avatar', mu.avatar_url,
                  'skills', mu.skills
                )) FILTER (WHERE pm.user_id IS NOT NULL) as members
         FROM projects p
         LEFT JOIN users u ON p.manager_id = u.id
         LEFT JOIN departments d ON p.department_id = d.id
         LEFT JOIN project_members pm ON p.id = pm.project_id
         LEFT JOIN users mu ON pm.user_id = mu.id
         WHERE p.id = $1
         GROUP BY p.id, u.first_name, u.last_name, d.name`,
        [req.params.id]
      );
      return result.rows[0];
    }, 60);

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Get milestones
    const milestones = await query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY due_date',
      [req.params.id]
    );

    res.json({ project: { ...project, milestones: milestones.rows } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { title, description, status, deadline, priority } = req.body;
    const result = await query(
      `UPDATE projects SET title = COALESCE($1, title), description = COALESCE($2, description),
       status = COALESCE($3, status), deadline = COALESCE($4, deadline),
       priority = COALESCE($5, priority), updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [title, description, status, deadline, priority, req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    dataCache.del(CachePilot.buildKey('project', req.params.id));
    res.json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', authenticate, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const { title, description, dueDate } = req.body;
    const result = await query(
      `INSERT INTO milestones (project_id, title, description, due_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, title, description, dueDate]
    );
    dataCache.del(CachePilot.buildKey('project', req.params.id));
    res.status(201).json({ milestone: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/tasks
router.get('/:id/tasks', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*,
              json_agg(DISTINCT jsonb_build_object(
                'id', u.id, 'name', u.first_name || ' ' || u.last_name, 'avatar', u.avatar_url
              )) FILTER (WHERE u.id IS NOT NULL) as assignees
       FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.project_id = $1
       GROUP BY t.id
       ORDER BY t.position, t.created_at`,
      [req.params.id]
    );
    res.json({ tasks: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
