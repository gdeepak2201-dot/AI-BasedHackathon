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

  // Employees - Extended list with 20+ employees
  const employeeHash = await bcrypt.hash('Employee@123', 12);
  const employees = [
    // Engineering Team
    { email: 'alice@skillsync.ai', first: 'Alice', last: 'Chen', dept: 'Engineering', skills: ['react', 'typescript', 'node.js', 'graphql', 'aws', 'docker'] },
    { email: 'bob@skillsync.ai', first: 'Bob', last: 'Martinez', dept: 'Engineering', skills: ['python', 'machine learning', 'tensorflow', 'data analysis', 'pytorch'] },
    { email: 'eve@skillsync.ai', first: 'Eve', last: 'Thompson', dept: 'Engineering', skills: ['java', 'spring boot', 'microservices', 'docker', 'kubernetes'] },
    { email: 'frank@skillsync.ai', first: 'Frank', last: 'Johnson', dept: 'Engineering', skills: ['golang', 'rust', 'system design', 'performance optimization'] },
    { email: 'grace@skillsync.ai', first: 'Grace', last: 'Lee', dept: 'Engineering', skills: ['vue.js', 'angular', 'css', 'html', 'webpack'] },
    { email: 'henry@skillsync.ai', first: 'Henry', last: 'Brown', dept: 'Engineering', skills: ['devops', 'kubernetes', 'terraform', 'ci/cd', 'aws'] },
    
    // Product Team
    { email: 'carol@skillsync.ai', first: 'Carol', last: 'Williams', dept: 'Product', skills: ['product management', 'ux design', 'figma', 'user research', 'analytics'] },
    { email: 'iris@skillsync.ai', first: 'Iris', last: 'Patel', dept: 'Product', skills: ['product strategy', 'roadmap planning', 'stakeholder management', 'market research'] },
    { email: 'jack@skillsync.ai', first: 'Jack', last: 'Wilson', dept: 'Product', skills: ['ui design', 'prototyping', 'user testing', 'design systems'] },
    
    // Data Science Team
    { email: 'david@skillsync.ai', first: 'David', last: 'Kim', dept: 'Data Science', skills: ['python', 'sql', 'tableau', 'statistics', 'r', 'spark'] },
    { email: 'karen@skillsync.ai', first: 'Karen', last: 'Davis', dept: 'Data Science', skills: ['data engineering', 'etl', 'apache spark', 'hadoop', 'hive'] },
    { email: 'leo@skillsync.ai', first: 'Leo', last: 'Garcia', dept: 'Data Science', skills: ['analytics', 'business intelligence', 'power bi', 'looker'] },
    
    // Operations Team
    { email: 'mia@skillsync.ai', first: 'Mia', last: 'Anderson', dept: 'Operations', skills: ['project management', 'agile', 'scrum', 'jira', 'confluence'] },
    { email: 'noah@skillsync.ai', first: 'Noah', last: 'Taylor', dept: 'Operations', skills: ['hr management', 'recruitment', 'employee relations', 'training'] },
    { email: 'olivia@skillsync.ai', first: 'Olivia', last: 'Thomas', dept: 'Operations', skills: ['finance', 'budgeting', 'accounting', 'excel'] },
    
    // QA Team
    { email: 'paul@skillsync.ai', first: 'Paul', last: 'Jackson', dept: 'Engineering', skills: ['qa automation', 'selenium', 'pytest', 'test planning', 'bug tracking'] },
    { email: 'quinn@skillsync.ai', first: 'Quinn', last: 'White', dept: 'Engineering', skills: ['manual testing', 'test cases', 'regression testing', 'performance testing'] },
    
    // Security Team
    { email: 'rachel@skillsync.ai', first: 'Rachel', last: 'Harris', dept: 'Engineering', skills: ['cybersecurity', 'penetration testing', 'security audit', 'compliance'] },
    { email: 'sam@skillsync.ai', first: 'Sam', last: 'Martin', dept: 'Engineering', skills: ['network security', 'firewall', 'vpn', 'encryption'] },
    
    // Additional Staff
    { email: 'tina@skillsync.ai', first: 'Tina', last: 'Rodriguez', dept: 'Product', skills: ['content strategy', 'copywriting', 'seo', 'marketing'] },
    { email: 'uma@skillsync.ai', first: 'Uma', last: 'Singh', dept: 'Data Science', skills: ['nlp', 'computer vision', 'deep learning', 'reinforcement learning'] }
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

  // Create Projects - Extended list with 12+ projects
  const projectsResult = await query(`
    INSERT INTO projects (title, description, manager_id, department_id, status, priority, start_date, deadline)
    VALUES 
      ('AI Dashboard Redesign', 'Modernize the analytics dashboard with new UI/UX', $1, $2, 'active', 'high', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days'),
      ('Mobile App Development', 'Build cross-platform mobile application', $1, $2, 'active', 'high', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '45 days'),
      ('Data Pipeline Optimization', 'Improve ETL performance and reliability', $1, $3, 'active', 'medium', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '30 days'),
      ('API Gateway Migration', 'Migrate to new API gateway infrastructure', $1, $2, 'planning', 'medium', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '60 days'),
      ('Real-time Analytics Engine', 'Build real-time data processing system', $1, $3, 'active', 'high', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '35 days'),
      ('Security Audit & Compliance', 'Comprehensive security review and compliance check', $1, $2, 'in_progress', 'critical', CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '15 days'),
      ('Customer Portal Redesign', 'Complete redesign of customer-facing portal', $1, $4, 'active', 'high', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '50 days'),
      ('Machine Learning Model Development', 'Develop predictive models for business intelligence', $1, $3, 'active', 'high', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '40 days'),
      ('Microservices Architecture', 'Refactor monolith to microservices', $1, $2, 'planning', 'high', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '90 days'),
      ('Performance Optimization', 'Optimize application performance and reduce latency', $1, $2, 'in_progress', 'medium', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '25 days'),
      ('Cloud Migration', 'Migrate infrastructure to cloud platform', $1, $2, 'planning', 'critical', CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '120 days'),
      ('AI-Powered Chatbot', 'Develop intelligent customer support chatbot', $1, $4, 'active', 'medium', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '55 days')
    ON CONFLICT DO NOTHING
    RETURNING id, title
  `, [managerId, deptMap['Engineering'], deptMap['Data Science'], deptMap['Operations']]);

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

  // Create Tasks - Extended list with 50+ tasks
  if (projectIds.length > 0) {
    const taskStatuses = ['pending', 'in_progress', 'review', 'completed'];
    const taskPriorities = ['low', 'medium', 'high', 'critical'];
    const taskTitles = [
      'Design system components', 'Implement authentication', 'Setup database schema', 'Create API endpoints',
      'Write unit tests', 'Performance optimization', 'Documentation', 'Code review', 'Bug fixes', 'Deployment preparation',
      'Frontend integration', 'Backend validation', 'Security hardening', 'Load testing', 'Database indexing',
      'Cache implementation', 'Error handling', 'Logging setup', 'Monitoring setup', 'Alert configuration',
      'User interface design', 'API documentation', 'Database migration', 'Backup strategy', 'Disaster recovery',
      'Mobile responsiveness', 'Accessibility audit', 'Performance profiling', 'Memory optimization', 'Network optimization',
      'CI/CD pipeline setup', 'Docker containerization', 'Kubernetes deployment', 'Service mesh integration', 'API versioning',
      'Rate limiting', 'Authentication tokens', 'Authorization rules', 'Data encryption', 'SSL/TLS setup',
      'Monitoring dashboard', 'Alert system', 'Log aggregation', 'Metrics collection', 'Health checks',
      'User onboarding', 'Feature flags', 'A/B testing', 'Analytics integration', 'User feedback system'
    ];

    for (let i = 0; i < 50; i++) {
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
        `Detailed task description for ${taskTitles[i % taskTitles.length]}. This task requires careful planning and execution.`,
        status,
        priority,
        Math.random() * 40 + 4,
        managerId
      ]);
    }

    // Get created tasks and assign them
    const tasksResult = await query(`
      SELECT id FROM tasks LIMIT 50
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

  // Create Active Time Logs (for 2 weeks)
  const today = new Date();
  for (const email of Object.keys(userMap)) {
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
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

  // Create Workload Logs (for 4 weeks)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  for (let week = 0; week < 4; week++) {
    const currentWeekStart = new Date(weekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - (week * 7));
    const weekStartStr = currentWeekStart.toISOString().split('T')[0];

    for (const email of Object.keys(userMap)) {
      const burnoutRisk = Math.random() * 0.6 + 0.2; // 20-80%
      const totalTasks = Math.floor(Math.random() * 12) + 5;
      const completedTasks = Math.floor(totalTasks * (Math.random() * 0.7 + 0.2));
      const overdueTasks = Math.floor(Math.random() * 3);

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
  }

  // Create Peer Reviews - More comprehensive
  const emailArray = Object.keys(userMap);
  const feedbackTemplates = [
    'Excellent work on the project. Great communication and collaboration with the team. Very reliable and delivers quality work.',
    'Strong technical skills and great problem-solving abilities. Could improve on documentation.',
    'Outstanding leadership and mentoring. Inspires the team and drives results.',
    'Very collaborative and always willing to help teammates. Great attitude.',
    'Exceptional attention to detail. Produces high-quality work consistently.',
    'Great communication skills and very responsive to feedback.',
    'Strong analytical skills and great at breaking down complex problems.',
    'Very creative and brings innovative ideas to the table.',
    'Reliable team player who consistently delivers on commitments.',
    'Great at mentoring junior team members and sharing knowledge.'
  ];

  for (let i = 0; i < emailArray.length; i++) {
    for (let j = 0; j < emailArray.length; j++) {
      if (i !== j && Math.random() > 0.3) {
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
          feedbackTemplates[Math.floor(Math.random() * feedbackTemplates.length)],
          'Q2-2026'
        ]);
      }
    }
  }

  // Create Leaves - More variety
  const leaveReasons = [
    'Family vacation',
    'Medical appointment',
    'Personal time',
    'Conference attendance',
    'Training program',
    'Sick leave',
    'Emergency',
    'Maternity leave',
    'Paternity leave',
    'Sabbatical'
  ];

  for (const email of Object.keys(userMap)) {
    for (let k = 0; k < 3; k++) {
      if (Math.random() > 0.4) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) + 5);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 10) + 1);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        await query(`
          INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          userMap[email],
          ['annual', 'sick', 'personal', 'unpaid'][Math.floor(Math.random() * 4)],
          startStr,
          endStr,
          leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
          ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)]
        ]);
      }
    }
  }

  // Create Compensation Suggestions - More detailed
  const suggestionTypes = ['promotion', 'raise', 'bonus', 'stock_options'];
  const levels = ['Junior Engineer', 'Senior Engineer', 'Lead Engineer', 'Principal Engineer', 'Manager', 'Director'];
  const rationales = [
    'Based on strong performance metrics and team feedback',
    'Exceptional technical contributions and leadership',
    'Consistent high performance and reliability',
    'Market rate adjustment for retention',
    'Promotion based on demonstrated leadership',
    'Performance bonus for exceeding targets',
    'Equity grant for long-term commitment',
    'Salary adjustment for expanded responsibilities'
  ];

  for (const email of Object.keys(userMap)) {
    const performanceScore = Math.random() * 0.4 + 0.6;
    const productivityScore = Math.random() * 0.4 + 0.6;
    const collaborationScore = Math.random() * 0.4 + 0.6;
    const innovationScore = Math.random() * 0.4 + 0.5;
    const overallScore = (performanceScore + productivityScore + collaborationScore + innovationScore) / 4;

    const suggestionType = overallScore > 0.75 ? 'promotion' : (overallScore > 0.65 ? 'raise' : 'bonus');
    const currentLevel = levels[Math.floor(Math.random() * levels.length)];
    const suggestedLevel = levels[Math.min(levels.indexOf(currentLevel) + 1, levels.length - 1)];

    await query(`
      INSERT INTO compensation_suggestions (user_id, suggestion_type, current_level, suggested_level, performance_score, productivity_score, collaboration_score, innovation_score, overall_score, rationale, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT DO NOTHING
    `, [
      userMap[email],
      suggestionType,
      currentLevel,
      suggestedLevel,
      performanceScore,
      productivityScore,
      collaborationScore,
      innovationScore,
      overallScore,
      rationales[Math.floor(Math.random() * rationales.length)],
      ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)]
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

  logger.info('✅ Database seeded successfully with comprehensive sample data');
  logger.info('Demo accounts:');
  logger.info('  Admin:    admin@skillsync.ai / Admin@123');
  logger.info('  Manager:  manager@skillsync.ai / Manager@123');
  logger.info('  Employee: alice@skillsync.ai / Employee@123 (+ 19 more employees)');
  logger.info('');
  logger.info('Sample data created:');
  logger.info(`  - ${Object.keys(userMap).length} employees across 4 departments`);
  logger.info(`  - ${projectIds.length} projects with various statuses`);
  logger.info('  - 50+ tasks with assignments and dependencies');
  logger.info('  - Active time logs for 2 weeks (weekdays only)');
  logger.info('  - Workload metrics for 4 weeks');
  logger.info('  - Comprehensive peer reviews');
  logger.info('  - Multiple leave requests with various statuses');
  logger.info('  - Detailed compensation suggestions');
  logger.info('  - Notifications for all users');
  process.exit(0);
}

seed().catch(err => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
