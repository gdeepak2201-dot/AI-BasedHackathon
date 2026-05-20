# SkillSync Dashboard Examples

## 📊 What You'll See After Seeding

This document shows example data that will appear in each dashboard after running the seed script.

---

## 👤 Employee Dashboard (alice@skillsync.ai)

### Header
```
Good morning, Alice 👋
Wednesday, May 20, 2024
```

### Task Statistics
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Active Tasks   │    Pending      │   In Review     │   Completed     │
│       4         │       1         │       1         │       3         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Overdue Alert (if applicable)
```
⚠️  1 overdue task
Please review and update your task statuses
```

### Upcoming Tasks
```
Task List:
├─ 🔴 Design system components (Critical)
│  Project: AI Dashboard Redesign
│  Status: In Progress | Due: May 25
│
├─ 🟠 Implement authentication (High)
│  Project: Mobile App Development
│  Status: Pending | Due: May 28
│
├─ 🟡 Setup database schema (Medium)
│  Project: Data Pipeline Optimization
│  Status: Review | Due: May 22
│
└─ 🟢 Create API endpoints (Low)
   Project: API Gateway Migration
   Status: Pending | Due: Jun 5
```

### Wellbeing Score
```
┌──────────────────────────────────┐
│  Wellbeing Score                 │
│  ████████░░░░░░░░░░░░░░░░░░░░░░ │
│  72%                             │
│  Status: MEDIUM RISK             │
│                                  │
│  💡 Tip: Take regular breaks     │
│     to maintain productivity     │
└──────────────────────────────────┘
```

### Performance Radar
```
        Technical
           ▲
          /│\
         / │ \
        /  │  \
       /   │   \
      ╱────┼────╲
     /     │     \
    /      │      \
Collaboration  Leadership
    \      │      /
     \     │     /
      ╲────┼────╱
       \   │   /
        \  │  /
         \ │ /
          \│/
           ▼
    Productivity
```

### This Week Stats
```
┌─────────────────────────────────┐
│  This Week                      │
├─────────────────────────────────┤
│ Active Hours:      38.5h        │
│ Productivity:      78%          │
│ Overtime:          4.5h         │
└─────────────────────────────────┘
```

---

## 👔 Manager Dashboard (manager@skillsync.ai)

### Header
```
Manager Overview
Team performance and AI insights at a glance
```

### Project Statistics
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Active Projects  │  Team Members    │ Pending Leaves   │ On Leave Today   │
│        3         │        5         │        1         │        0         │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Burnout Risk Alerts
```
⚠️  Burnout Risk Alerts

┌─────────────────────────────────────┐
│ 👤 Bob Martinez                     │
│ Risk Level: HIGH (68%)              │
│ Recommendation: Reduce workload     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👤 Eve Thompson                     │
│ Risk Level: MEDIUM (52%)            │
│ Recommendation: Monitor closely     │
└─────────────────────────────────────┘
```

### Task Distribution (Pie Chart)
```
Task Distribution
├─ Pending:      4 tasks (27%)  🔵
├─ In Progress:  4 tasks (27%)  🟢
├─ Review:       4 tasks (27%)  🟡
└─ Completed:    3 tasks (20%)  🟣
```

### Team Productivity
```
┌──────────────────────────────────┐
│  Team Productivity               │
│                                  │
│         78%                      │
│      Average today               │
│                                  │
│  Active Tasks:        12         │
│  Team Size:           5          │
│  Overdue Projects:    0          │
└──────────────────────────────────┘
```

### AI Org Insights
```
🧠 AI Organization Insights

✓ Team collaboration is strong
✓ Project timelines are on track
⚠️  Monitor Bob Martinez's workload
⚠️  Consider leave coverage for upcoming requests
```

---

## 🛡️ Admin Dashboard (admin@skillsync.ai)

### Header
```
Admin Panel
System-wide overview and controls
```

### Organization Statistics
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Total Employees  │ Active Projects  │ Tasks In Progress│ Pending Leaves   │ Avg Burnout Risk │
│        7         │        3         │        4         │        1         │       48%        │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Department Overview (Bar Chart)
```
Department Overview

Engineering    ████████████ 3 employees
Product        ████ 1 employee
Data Science   ████ 1 employee
Operations     ████ 1 employee
```

### AI Agent Performance (7 days)
```
🧠 AI Agent Performance (7 days)

Burnout Agent
████████████████████ 100% success rate
├─ Executions: 24
├─ Avg Time: 245ms
└─ Success Rate: 100%

Skill Extraction Agent
██████████████████░░ 95% success rate
├─ Executions: 19
├─ Avg Time: 312ms
└─ Success Rate: 95%

Compensation Agent
██████████████████░░ 92% success rate
├─ Executions: 12
├─ Avg Time: 428ms
└─ Success Rate: 92%

Team Chemistry Agent
████████████████░░░░ 88% success rate
├─ Executions: 8
├─ Avg Time: 156ms
└─ Success Rate: 88%
```

### Quick Links
```
[🧠 AI Insights]  [⚠️ Burnout Monitor]  [👥 Team Analytics]  [💰 Compensation]
```

---

## 📈 Sample Data Values

### Productivity Scores
```
Alice Chen:      85% (High performer)
Bob Martinez:    65% (Needs support)
Carol Williams:  78% (Good)
David Kim:       82% (High performer)
Eve Thompson:    76% (Good)
```

### Burnout Risk Scores
```
Alice Chen:      28% (Low)
Bob Martinez:    68% (High)
Carol Williams:  45% (Medium)
David Kim:       35% (Low)
Eve Thompson:    52% (Medium)
```

### Task Completion Rates
```
Alice Chen:      75% (3 of 4 tasks)
Bob Martinez:    60% (3 of 5 tasks)
Carol Williams:  70% (2 of 3 tasks)
David Kim:       80% (4 of 5 tasks)
Eve Thompson:    65% (2 of 3 tasks)
```

### Weekly Hours
```
Alice Chen:      38.5 hours (+ 2.5 overtime)
Bob Martinez:    42 hours (+ 8 overtime)
Carol Williams:  40 hours (+ 1 overtime)
David Kim:       39 hours (+ 0 overtime)
Eve Thompson:    41 hours (+ 4 overtime)
```

---

## 🎯 Key Metrics Explained

### Wellbeing Score
- **Calculation:** 100% - Burnout Risk Score
- **Range:** 0-100%
- **Color Coding:**
  - 🟢 Green (80-100%): Healthy
  - 🟡 Yellow (60-80%): Monitor
  - 🟠 Orange (40-60%): At Risk
  - 🔴 Red (0-40%): Critical

### Productivity Score
- **Range:** 0-100%
- **Based on:** Active time, task completion, quality
- **Target:** 75%+

### Burnout Risk Score
- **Range:** 0-100%
- **Factors:** Workload, overtime, task completion
- **Alert Threshold:** 60%+

### Performance Radar
- **Dimensions:** Technical, Collaboration, Leadership, Productivity, Reliability
- **Scale:** 0-100 per dimension
- **Target:** 70%+ across all dimensions

---

## 📊 Data Refresh Rates

- **Employee Dashboard:** Refreshes every 60 seconds
- **Manager Dashboard:** Refreshes every 60 seconds
- **Admin Dashboard:** Refreshes on page load
- **Time Logs:** Updated daily
- **Workload Logs:** Updated weekly
- **Burnout Scores:** Updated weekly

---

## 🔄 Interactive Features

### Employee Dashboard
- ✅ Click tasks to view details
- ✅ Filter by status/priority
- ✅ View project details
- ✅ Check upcoming deadlines

### Manager Dashboard
- ✅ Click employee names to view profiles
- ✅ Drill down into projects
- ✅ View team member details
- ✅ Access burnout recommendations

### Admin Dashboard
- ✅ Click departments for details
- ✅ View agent performance trends
- ✅ Access system settings
- ✅ Generate reports

---

## 💡 Tips for Testing

1. **Login as different roles** to see different dashboards
2. **Check data consistency** across dashboards
3. **Verify calculations** (burnout, productivity, etc.)
4. **Test filters and sorting** on task lists
5. **Check responsive design** on different screen sizes
6. **Verify real-time updates** by refreshing
7. **Test navigation** between dashboards
8. **Check error handling** with invalid data

---

## 🐛 Common Issues & Solutions

### No data showing?
- Verify seed script completed
- Check database connection
- Refresh page

### Incorrect calculations?
- Verify data in database
- Check calculation logic
- Review sample data values

### Missing employees?
- Run seed script again
- Check user creation in database
- Verify role assignments

### Stale data?
- Refresh page
- Clear browser cache
- Check API response times

---

**Ready to explore? Run the seed script and login!**
