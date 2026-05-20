require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectPostgres, query } = require('./postgres');
const logger = require('../utils/logger');

async function seed() {
  await connectPostgres();
  logger.info('Seeding database...');

  // Departments
  const depts = await query(`
    INSERT INTO departments (name, description) VALUES
      ('Engineering', 'Software development and architecture'),
      ('Product', 'Product management and design'),
      ('Data Science', 'AI/ML and analytics'),
      ('Operations', 'Business operations and HR')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id, name
  `);

  const deptMap = {};
  depts.rows.forEach(d => { deptMap[d.name] = d.id; });

  // Admin user
  const adminHash = await bcrypt.hash('Admin@123', 12);
  await query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role_id, department_id)
    VALUES ('admin@skillsync.ai', $1, 'System', 'Admin', 3, $2)
    ON CONFLICT (email) DO NOTHING
  `, [adminHash, deptMap['Operations']]);

  // Manager
  const managerHash = await bcrypt.hash('Manager@123', 12);
  const managerResult = await query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role_id, department_id, skills)
    VALUES ('manager@skillsync.ai', $1, 'Sarah', 'Johnson', 2, $2, $3)
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `, [managerHash, deptMap['Engineering'], JSON.stringify(['leadership', 'project management', 'agile'])]);

  const managerId = managerResult.rows[0]?.id;

  // Employees
  const employeeHash = await bcrypt.hash('Employee@123', 12);
  const employees = [
    { email: 'alice@skillsync.ai', first: 'Alice', last: 'Chen', dept: 'Engineering', skills: ['react', 'typescript', 'node.js', 'graphql'] },
    { email: 'bob@skillsync.ai', first: 'Bob', last: 'Martinez', dept: 'Engineering', skills: ['python', 'machine learning', 'tensorflow', 'data analysis'] },
    { email: 'carol@skillsync.ai', first: 'Carol', last: 'Williams', dept: 'Product', skills: ['product management', 'ux design', 'figma', 'user research'] },
    { email: 'david@skillsync.ai', first: 'David', last: 'Kim', dept: 'Data Science', skills: ['python', 'sql', 'tableau', 'statistics'] },
    { email: 'eve@skillsync.ai', first: 'Eve', last: 'Thompson', dept: 'Engineering', skills: ['java', 'spring boot', 'microservices', 'docker'] }
  ];

  const userMap = {};
  for (const emp of employees) {
    const result = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role_id, department_id, skills)
      VALUES ($1, $2, $3, $4, 1, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [emp.email, employeeHash, emp.first, emp.last, deptMap[emp.dept], JSON.stringify(emp.skills)]);
    if (result.rows[0]) {
      userMap[emp.email] = result.rows[0].id;
    }
  }

  // Create Projects
  const projectsResult = await query(`
    INSERT INTO projects (title, description, manager_id, department_id, status, priority, start_date, deadline)
    VALUES 
      ('AI Dashboard Redesign', 'Modernize the analytics dashboard with new UI/UX', $1, $2, 'active', 'high', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days'),
      ('Mobile App Development', 'Build cross-platform mobile application', $1, $2, 'active', 'high', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '45 days'),
      ('Data Pipeline Optimization', 'Improve ETL performance and reliability', $1, $3, 'active', 'medium', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '30 days'),
      ('API Gateway Migration', 'Migrate to new API gateway infrastructure', $1, $2, 'planning', 'medium', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '60 days')
    ON CONFLICT DO NOTHING
    RETURNING id, title
  `, [managerId, deptMap['Engineering'], deptMap['Data Science']]);

  const projectIds = projectsResult.rows.map(p => p.id);

  // Add project members
  if (projectIds.length > 0) {
    for (const email of Object.keys(userMap)) {
      for (const projectId of projectIds.slice(0, 2)) {
        await query(`
          INSERT INTO project_members (project_id, user_id, role)
          VALUES ($1, $2, 'member')
          ON CONFLICT DO NOTHING
        `, [projectId, userMap[email]]);
      }
    }
  }

  // Create Tasks
  if (projectIds.length > 0) {
    const taskStatuses = ['pending', 'in_progress', 'review', 'completed'];
    const taskPriorities = ['low', 'medium', 'high', 'critical'];
    const taskTitles = [
      'Design system components',
      'Implement authentication',
      'Setup database schema',
      'Create API endpoints',
      'Write unit tests',
      'Performance optimization',
      'Documentation',
      'Code review',
      'Bug fixes',
      'Deployment preparation'
    ];

    for (let i = 0; i < 15; i++) {
      const projectId = projectIds[i % projectIds.length];
      const status = taskStatuses[i % taskStatuses.length];
      const priority = taskPriorities[i % taskPriorities.length];
      const daysOffset = Math.floor(Math.random() * 30) - 10;
      
      await query(`
        INSERT INTO tasks (project_id, title, description, status, priority, deadline, estimated_hours, created_by)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '${daysOffset} days', $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        projectId,
        taskTitles[i % taskTitles.length],
        `Task description for ${taskTitles[i % taskTitles.length]}`,
        status,
        priority,
        Math.random() * 16 + 4,
        managerId
      ]);
    }

    // Get created tasks and assign them
    const tasksResult = await query(`
      SELECT id FROM tasks LIMIT 15
    `);

    for (const task of tasksResult.rows) {
      const randomEmail = Object.keys(userMap)[Math.floor(Math.random() * Object.keys(userMap).length)];
      await query(`
        INSERT INTO task_assignments (task_id, user_id, assigned_by, is_primary)
        VALUES ($1, $2, $3, true)
        ON CONFLICT DO NOTHING
      `, [task.id, userMap[randomEmail], managerId]);
    }
  }

  // Create Active Time Logs (for this week)
  const today = new Date();
  for (const email of Object.keys(userMap)) {
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const activeMinutes = Math.floor(Math.random() * 240) + 360; // 6-10 hours
      const productivity = Math.random() * 0.4 + 0.6; // 60-100%
      const overtime = Math.random() > 0.7 ? Math.floor(Math.random() * 120) : 0;

      await query(`
        INSERT INTO active_time_logs (user_id, date, active_minutes, productivity_score, overtime_minutes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, date) DO UPDATE SET 
          active_minutes = EXCLUDED.active_minutes,
          productivity_score = EXCLUDED.productivity_score,
          overtime_minutes = EXCLUDED.overtime_minutes
      `, [userMap[email], dateStr, activeMinutes, productivity, overtime]);
    }
  }

  // Create Workload Logs (for this week)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  for (const email of Object.keys(userMap)) {
    const burnoutRisk = Math.random() * 0.6 + 0.2; // 20-80%
    const totalTasks = Math.floor(Math.random() * 8) + 3;
    const completedTasks = Math.floor(totalTasks * (Math.random() * 0.6 + 0.3));
    const overdueTasks = Math.floor(Math.random() * 2);

    await query(`
      INSERT INTO workload_logs (user_id, week_start, total_tasks, completed_tasks, overdue_tasks, avg_daily_hours, burnout_risk_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, week_start) DO UPDATE SET
        total_tasks = EXCLUDED.total_tasks,
        completed_tasks = EXCLUDED.completed_tasks,
        overdue_tasks = EXCLUDED.overdue_tasks,
        burnout_risk_score = EXCLUDED.burnout_risk_score
    `, [userMap[email], weekStartStr, totalTasks, completedTasks, overdueTasks, Math.random() * 4 + 6, burnoutRisk]);
  }

  // Create Peer Reviews
  const emailArray = Object.keys(userMap);
  for (let i = 0; i < emailArray.length; i++) {
    for (let j = 0; j < emailArray.length; j++) {
      if (i !== j && Math.random() > 0.5) {
        await query(`
          INSERT INTO peer_reviews (reviewer_id, reviewee_id, communication_score, leadership_score, collaboration_score, technical_score, reliability_score, feedback, period)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
        `, [
          userMap[emailArray[i]],
          userMap[emailArray[j]],
          Math.floor(Math.random() * 3) + 3,
          Math.floor(Math.random() * 3) + 3,
          Math.floor(Math.random() * 3) + 3,
          Math.floor(Math.random() * 3) + 3,
          Math.floor(Math.random() * 3) + 3,
          'Great work on the recent project. Keep up the excellent collaboration!',
          'Q1-2024'
        ]);
      }
    }
  }

  // Create Leaves
  for (const email of Object.keys(userMap)) {
    if (Math.random() > 0.6) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 5);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      await query(`
        INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        userMap[email],
        ['annual', 'sick', 'personal'][Math.floor(Math.random() * 3)],
        startStr,
        endStr,
        'Taking time off for personal reasons',
        ['pending', 'approved'][Math.floor(Math.random() * 2)]
      ]);
    }
  }

  // Create Compensation Suggestions
  for (const email of Object.keys(userMap)) {
    const performanceScore = Math.random() * 0.4 + 0.6;
    const productivityScore = Math.random() * 0.4 + 0.6;
    const collaborationScore = Math.random() * 0.4 + 0.6;
    const innovationScore = Math.random() * 0.4 + 0.5;
    const overallScore = (performanceScore + productivityScore + collaborationScore + innovationScore) / 4;

    await query(`
      INSERT INTO compensation_suggestions (user_id, suggestion_type, current_level, suggested_level, performance_score, productivity_score, collaboration_score, innovation_score, overall_score, rationale, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT DO NOTHING
    `, [
      userMap[email],
      overallScore > 0.75 ? 'promotion' : 'raise',
      'Senior Engineer',
      overallScore > 0.75 ? 'Lead Engineer' : 'Senior Engineer',
      performanceScore,
      productivityScore,
      collaborationScore,
      innovationScore,
      overallScore,
      'Based on strong performance metrics and team feedback',
      'pending'
    ]);
  }

  // Create Notifications
  for (const email of Object.keys(userMap)) {
    await query(`
      INSERT INTO notifications (user_id, type, title, message, priority)
      VALUES 
        ($1, 'task_assigned', 'New Task Assigned', 'You have been assigned a new task: Design system components', 'high'),
        ($1, 'leave_approved', 'Leave Approved', 'Your leave request has been approved', 'normal'),
        ($1, 'peer_review', 'Peer Review Received', 'You have received a new peer review', 'normal')
      ON CONFLICT DO NOTHING
    `, [userMap[email]]);
  }

  logger.info('✅ Database seeded successfully with sample data');
  logger.info('Demo accounts:');
  logger.info('  Admin:    admin@skillsync.ai / Admin@123');
  logger.info('  Manager:  manager@skillsync.ai / Manager@123');
  logger.info('  Employee: alice@skillsync.ai / Employee@123');
  logger.info('');
  logger.info('Sample data created:');
  logger.info(`  - ${Object.keys(userMap).length} employees`);
  logger.info(`  - ${projectIds.length} projects`);
  logger.info('  - 15 tasks with assignments');
  logger.info('  - Active time logs for the week');
  logger.info('  - Workload and burnout data');
  logger.info('  - Peer reviews');
  logger.info('  - Leave requests');
  logger.info('  - Compensation suggestions');
  logger.info('  - Notifications');
  process.exit(0);
}

seed().catch(err => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
