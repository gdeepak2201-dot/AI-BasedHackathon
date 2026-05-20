require('dotenv').config();
const { connectPostgres, query } = require('./postgres');
const logger = require('../utils/logger');

const migrations = [
  // 001 - Roles
  `CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 002 - Departments
  `CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 003 - Users
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id) DEFAULT 1,
    department_id UUID REFERENCES departments(id),
    avatar_url TEXT,
    phone VARCHAR(20),
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    refresh_token TEXT,
    skills JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 004 - Projects
  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    deadline DATE,
    budget DECIMAL(15,2),
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 005 - Project Members
  `CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
  )`,

  // 006 - Milestones
  `CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 007 - Tasks
  `CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    skill_tags JSONB DEFAULT '[]',
    deadline DATE,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2) DEFAULT 0,
    position INTEGER DEFAULT 0,
    parent_task_id UUID REFERENCES tasks(id),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 008 - Task Assignments
  `CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(task_id, user_id)
  )`,

  // 009 - Task Dependencies
  `CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start',
    UNIQUE(task_id, depends_on_task_id)
  )`,

  // 010 - Contributions
  `CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    contribution_type VARCHAR(50) DEFAULT 'comment',
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 011 - Peer Reviews
  `CREATE TABLE IF NOT EXISTS peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
    leadership_score INTEGER CHECK (leadership_score BETWEEN 1 AND 5),
    collaboration_score INTEGER CHECK (collaboration_score BETWEEN 1 AND 5),
    technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 5),
    reliability_score INTEGER CHECK (reliability_score BETWEEN 1 AND 5),
    overall_score DECIMAL(3,2),
    feedback TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    period VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 012 - Leaves
  `CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) DEFAULT 'annual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    ai_impact_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 013 - Task Redistribution
  `CREATE TABLE IF NOT EXISTS task_redistributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_id UUID REFERENCES leaves(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    original_assignee_id UUID REFERENCES users(id),
    suggested_assignee_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    response_reason TEXT,
    responded_at TIMESTAMPTZ,
    ai_confidence_score DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 014 - Active Time Logs
  `CREATE TABLE IF NOT EXISTS active_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    login_time TIMESTAMPTZ,
    logout_time TIMESTAMPTZ,
    active_minutes INTEGER DEFAULT 0,
    idle_minutes INTEGER DEFAULT 0,
    break_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    productivity_score DECIMAL(5,4),
    app_usage JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
  )`,

  // 015 - Workload Logs
  `CREATE TABLE IF NOT EXISTS workload_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    overdue_tasks INTEGER DEFAULT 0,
    avg_daily_hours DECIMAL(5,2),
    burnout_risk_score DECIMAL(5,4),
    stress_indicators JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
  )`,

  // 016 - Compensation Suggestions
  `CREATE TABLE IF NOT EXISTS compensation_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50),
    current_level VARCHAR(100),
    suggested_level VARCHAR(100),
    performance_score DECIMAL(5,4),
    productivity_score DECIMAL(5,4),
    collaboration_score DECIMAL(5,4),
    innovation_score DECIMAL(5,4),
    overall_score DECIMAL(5,4),
    rationale TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 017 - Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 018 - AI Agent Logs
  `CREATE TABLE IF NOT EXISTS ai_agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 019 - Indexes
  `CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contributions_task ON contributions(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewee ON peer_reviews(reviewee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status)`,
  `CREATE INDEX IF NOT EXISTS idx_active_time_user_date ON active_time_logs(user_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_workload_user ON workload_logs(user_id)`,

  // 020 - Seed roles
  `INSERT INTO roles (name, permissions) VALUES 
    ('employee', '["read:own", "write:own", "review:peers"]'),
    ('manager', '["read:team", "write:projects", "approve:leaves", "view:ai"]'),
    ('admin', '["read:all", "write:all", "manage:users", "manage:system"]')
  ON CONFLICT (name) DO NOTHING`
];

async function runMigrations() {
  try {
    await connectPostgres();
    logger.info('Running database migrations...');

    for (let i = 0; i < migrations.length; i++) {
      try {
        await query(migrations[i]);
        logger.info(`Migration ${i + 1}/${migrations.length} completed`);
      } catch (error) {
        logger.error(`Migration ${i + 1} failed:`, error.message);
        throw error;
      }
    }

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
