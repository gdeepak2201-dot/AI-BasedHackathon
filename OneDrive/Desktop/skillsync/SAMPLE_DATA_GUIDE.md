# SkillSync Sample Data Guide

## ✅ Database Successfully Populated

Your SkillSync dashboard is now populated with comprehensive sample data. Here's what was added:

---

## 🔐 Demo Accounts

### Admin Account
- **Email:** `admin@skillsync.ai`
- **Password:** `Admin@123`
- **Role:** System Administrator
- **Department:** Operations

### Manager Account
- **Email:** `manager@skillsync.ai`
- **Password:** `Manager@123`
- **Role:** Manager
- **Department:** Engineering
- **Skills:** Leadership, Project Management, Agile

### Employee Accounts
All employees use password: `Employee@123`

| Email | Name | Department | Skills |
|-------|------|-----------|--------|
| alice@skillsync.ai | Alice Chen | Engineering | React, TypeScript, Node.js, GraphQL |
| bob@skillsync.ai | Bob Martinez | Engineering | Python, Machine Learning, TensorFlow, Data Analysis |
| carol@skillsync.ai | Carol Williams | Product | Product Management, UX Design, Figma, User Research |
| david@skillsync.ai | David Kim | Data Science | Python, SQL, Tableau, Statistics |
| eve@skillsync.ai | Eve Thompson | Engineering | Java, Spring Boot, Microservices, Docker |

---

## 📊 Sample Data Created

### Departments (4)
- **Engineering** - Software development and architecture
- **Product** - Product management and design
- **Data Science** - AI/ML and analytics
- **Operations** - Business operations and HR

### Projects (4)
1. **AI Dashboard Redesign** (Active - High Priority)
   - Manager: Sarah Johnson
   - Department: Engineering
   - Duration: 30 days
   - Status: In Progress

2. **Mobile App Development** (Active - High Priority)
   - Manager: Sarah Johnson
   - Department: Engineering
   - Duration: 50 days
   - Status: In Progress

3. **Data Pipeline Optimization** (Active - Medium Priority)
   - Manager: Sarah Johnson
   - Department: Data Science
   - Duration: 45 days
   - Status: In Progress

4. **API Gateway Migration** (Planning - Medium Priority)
   - Manager: Sarah Johnson
   - Department: Engineering
   - Duration: 65 days
   - Status: Planning

### Tasks (15)
Each project has multiple tasks with varying statuses:
- **Statuses:** Pending, In Progress, Review, Completed
- **Priorities:** Low, Medium, High, Critical
- **Sample Tasks:**
  - Design system components
  - Implement authentication
  - Setup database schema
  - Create API endpoints
  - Write unit tests
  - Performance optimization
  - Documentation
  - Code review
  - Bug fixes
  - Deployment preparation

### Time Tracking Data
- **Active Time Logs:** 5 days of data per employee
  - Active minutes: 6-10 hours per day
  - Productivity score: 60-100%
  - Overtime tracking enabled

### Workload & Burnout Data
- **Workload Logs:** Weekly data for all employees
  - Total tasks per week: 3-11
  - Completion rates: 30-90%
  - Burnout risk scores: 20-80%
  - Average daily hours: 6-10 hours

### Peer Reviews
- **Cross-team reviews** with scores for:
  - Communication (1-5)
  - Leadership (1-5)
  - Collaboration (1-5)
  - Technical Skills (1-5)
  - Reliability (1-5)

### Leave Requests
- **Types:** Annual, Sick, Personal
- **Statuses:** Pending, Approved
- **Duration:** 1-6 days per request

### Compensation Suggestions
- **Types:** Promotion, Raise
- **Based on:**
  - Performance score
  - Productivity score
  - Collaboration score
  - Innovation score
  - Overall score

### Notifications
Each employee has notifications for:
- Task assignments
- Leave approvals
- Peer reviews received

---

## 🚀 Getting Started

### Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

### Login Steps
1. Open http://localhost:3000 in your browser
2. Use any of the demo accounts above
3. Explore the dashboards with pre-populated data

### Dashboard Features You Can Explore

#### Employee Dashboard
- View assigned tasks
- Check workload and burnout metrics
- See peer reviews
- Manage leave requests
- View notifications

#### Manager Dashboard
- Monitor team workload
- View project progress
- Analyze team performance
- Review compensation suggestions
- Manage team members

#### Admin Dashboard
- System-wide analytics
- User management
- Department management
- AI insights and reports
- System configuration

---

## 📈 Data Insights Available

### AI-Powered Insights
- **Burnout Analysis:** Risk scores for each employee
- **Team Chemistry:** Peer review analysis
- **Skill Extraction:** Automatic skill identification
- **Compensation Analysis:** Fair pay recommendations
- **Leave Impact:** Project impact analysis
- **Organizational Insights:** Department-level analytics

### Metrics & Analytics
- Team productivity trends
- Task completion rates
- Workload distribution
- Skill gaps and opportunities
- Performance metrics
- Burnout risk indicators

---

## 🔄 Regenerating Sample Data

If you need to reset and regenerate the sample data:

```bash
# From the backend directory
npm run migrate    # Reset database schema
npm run seed       # Populate with fresh sample data
```

---

## 📝 Notes

- All sample data is randomly generated for realistic variation
- Dates are relative to today's date
- Skills are pre-populated for demonstration
- All passwords are for development only
- Neo4j and ChromaDB are optional (running in degraded mode)

---

## 🎯 Next Steps

1. **Explore the Dashboard:** Log in and navigate through different sections
2. **Test Features:** Try creating tasks, assigning work, requesting leaves
3. **Review Analytics:** Check the AI insights and burnout monitoring
4. **Customize:** Modify sample data as needed for your testing

Enjoy exploring SkillSync! 🎉
