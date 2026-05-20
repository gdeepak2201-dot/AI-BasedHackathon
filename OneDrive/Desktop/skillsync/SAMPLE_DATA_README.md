# SkillSync Sample Data - Complete Setup Guide

## 🎯 Overview

Your SkillSync dashboards are now populated with comprehensive sample data! This guide explains everything that's been added and how to use it.

---

## 📚 Documentation Files

We've created 4 comprehensive guides:

1. **QUICK_START.md** ⚡
   - 3-step setup process
   - Demo account credentials
   - What's included in sample data
   - Quick reference table

2. **SAMPLE_DATA_GUIDE.md** 📖
   - Detailed breakdown of all data
   - Database schema mapping
   - How to customize data
   - Troubleshooting guide

3. **SAMPLE_DATA_SUMMARY.md** 📊
   - Complete data statistics
   - User and project details
   - Testing scenarios
   - Verification checklist

4. **DASHBOARD_EXAMPLES.md** 🎨
   - Visual examples of dashboards
   - Sample data values
   - Key metrics explained
   - Interactive features

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Seed the Database
```bash
cd backend
node src/db/seed.js
```

### Step 2: Start Backend
```bash
npm start
```

### Step 3: Start Frontend
```bash
cd frontend
npm start
```

---

## 👥 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skillsync.ai | Admin@123 |
| Manager | manager@skillsync.ai | Manager@123 |
| Employee | alice@skillsync.ai | Employee@123 |
| Employee | bob@skillsync.ai | Employee@123 |
| Employee | carol@skillsync.ai | Employee@123 |
| Employee | david@skillsync.ai | Employee@123 |
| Employee | eve@skillsync.ai | Employee@123 |

---

## 📊 What's Included

### Users (7 total)
- 1 Admin
- 1 Manager (Sarah Johnson)
- 5 Employees across 3 departments

### Projects (4 total)
- 3 Active projects
- 1 Planning project
- All with realistic timelines

### Tasks (15 total)
- Various statuses (Pending, In Progress, Review, Completed)
- Different priorities (Critical, High, Medium, Low)
- Assigned to employees

### Work Tracking
- Active time logs (5 days per employee)
- Productivity scores (60-100%)
- Overtime tracking
- Weekly workload metrics

### Employee Wellbeing
- Burnout risk scores (20-80%)
- Workload analysis
- Stress indicators
- Recommendations

### Team Management
- Peer reviews with scores
- Leave requests (pending & approved)
- Compensation suggestions
- Notifications

---

## 📈 Dashboard Data

### Employee Dashboard
Shows individual task management and wellbeing:
- Active tasks count
- Task status breakdown
- Wellbeing score
- Performance radar
- Weekly productivity stats

### Manager Dashboard
Shows team performance and project status:
- Active projects
- Team size and productivity
- Burnout alerts
- Task distribution
- Leave management

### Admin Dashboard
Shows organization-wide metrics:
- Total employees
- Active projects
- System-wide burnout risk
- Department overview
- AI agent performance

---

## 🔍 Sample Data Details

### Employees
```
Alice Chen (Engineering)
- Skills: React, TypeScript, Node.js, GraphQL
- Productivity: 85%
- Burnout Risk: 28%
- Status: High performer

Bob Martinez (Engineering)
- Skills: Python, ML, TensorFlow, Data Analysis
- Productivity: 65%
- Burnout Risk: 68%
- Status: Needs support

Carol Williams (Product)
- Skills: Product Mgmt, UX Design, Figma, User Research
- Productivity: 78%
- Burnout Risk: 45%
- Status: Balanced

David Kim (Data Science)
- Skills: Python, SQL, Tableau, Statistics
- Productivity: 82%
- Burnout Risk: 35%
- Status: High performer

Eve Thompson (Engineering)
- Skills: Java, Spring Boot, Microservices, Docker
- Productivity: 76%
- Burnout Risk: 52%
- Status: Balanced
```

### Projects
```
1. AI Dashboard Redesign (Active, High Priority)
   - Duration: 30 days
   - Team: All 5 employees
   - Tasks: 3-4 assigned

2. Mobile App Development (Active, High Priority)
   - Duration: 50 days
   - Team: All 5 employees
   - Tasks: 3-4 assigned

3. Data Pipeline Optimization (Active, Medium Priority)
   - Duration: 45 days
   - Team: All 5 employees
   - Tasks: 3-4 assigned

4. API Gateway Migration (Planning, Medium Priority)
   - Duration: 55 days
   - Team: All 5 employees
   - Tasks: 3-4 assigned
```

---

## 🎯 Testing Scenarios

### Scenario 1: High Performer
Login as: **alice@skillsync.ai**
- High productivity (85%)
- Low burnout risk (28%)
- Promotion-eligible compensation
- Strong peer reviews

### Scenario 2: Overworked Employee
Login as: **bob@skillsync.ai**
- Lower productivity (65%)
- High burnout risk (68%)
- Significant overtime
- Needs support recommendations

### Scenario 3: Balanced Employee
Login as: **carol@skillsync.ai**
- Good productivity (78%)
- Medium burnout risk (45%)
- Moderate overtime
- Stable performance

### Scenario 4: Manager View
Login as: **manager@skillsync.ai**
- See all team members
- Monitor burnout alerts
- Track project progress
- Manage leave requests

### Scenario 5: Admin View
Login as: **admin@skillsync.ai**
- Organization-wide overview
- Department statistics
- AI agent performance
- System health metrics

---

## 🔧 Customization

### Add More Employees
Edit `backend/src/db/seed.js`:
```javascript
const employees = [
  // ... existing employees
  { 
    email: 'newuser@skillsync.ai', 
    first: 'First', 
    last: 'Last', 
    dept: 'Engineering', 
    skills: ['skill1', 'skill2'] 
  }
];
```

### Change Burnout Scores
Modify in seed.js:
```javascript
const burnoutRisk = Math.random() * 0.6 + 0.2; // Change range
```

### Add More Projects
Add to projects INSERT statement in seed.js

### Reset Database
```bash
node src/db/setup.js      # Create database
node src/db/migrate.js    # Create tables
node src/db/seed.js       # Populate data
```

---

## ✅ Verification Checklist

After running the seed script:

- [ ] 7 users created
- [ ] 4 projects created
- [ ] 15 tasks created
- [ ] Time logs populated
- [ ] Workload data populated
- [ ] Peer reviews created
- [ ] Leave requests created
- [ ] Compensation suggestions created
- [ ] Notifications created
- [ ] All dashboards show data

---

## 🐛 Troubleshooting

### No data showing in dashboards?
1. Verify seed script completed successfully
2. Check database connection in `.env`
3. Ensure you're logged in with correct role
4. Refresh the page

### Data looks incomplete?
1. Run seed script again (it's safe)
2. Check that all migrations completed
3. Verify PostgreSQL is running

### Want to reset?
```bash
# Drop and recreate database
node src/db/setup.js
node src/db/migrate.js
node src/db/seed.js
```

---

## 📊 Data Statistics

| Item | Count |
|------|-------|
| Users | 7 |
| Departments | 4 |
| Projects | 4 |
| Tasks | 15 |
| Time Logs | 25 |
| Workload Logs | 5 |
| Peer Reviews | ~10 |
| Leave Requests | ~2 |
| Compensation Suggestions | 5 |
| Notifications | 15 |

---

## 🎓 Learning Resources

### Understanding the Data
- See **SAMPLE_DATA_GUIDE.md** for detailed breakdown
- See **SAMPLE_DATA_SUMMARY.md** for statistics
- See **DASHBOARD_EXAMPLES.md** for visual examples

### Setting Up
- See **QUICK_START.md** for 3-step setup
- See **SAMPLE_DATA_GUIDE.md** for troubleshooting

### Customizing
- See **SAMPLE_DATA_GUIDE.md** for customization options
- Edit `backend/src/db/seed.js` directly

---

## 🚀 Next Steps

1. **Run the seed script** to populate data
2. **Start the application** (backend + frontend)
3. **Login with demo accounts** to explore
4. **Test different dashboards** (Employee, Manager, Admin)
5. **Customize data** as needed for your use case
6. **Review the guides** for detailed information

---

## 📞 Need Help?

1. Check the relevant guide:
   - Setup issues → QUICK_START.md
   - Data details → SAMPLE_DATA_GUIDE.md
   - Statistics → SAMPLE_DATA_SUMMARY.md
   - Visual examples → DASHBOARD_EXAMPLES.md

2. Review the seed script: `backend/src/db/seed.js`

3. Check database logs for errors

4. Verify PostgreSQL is running and accessible

---

## 📝 File Structure

```
skillsync/
├── QUICK_START.md                 # 3-step setup guide
├── SAMPLE_DATA_GUIDE.md           # Detailed documentation
├── SAMPLE_DATA_SUMMARY.md         # Statistics & overview
├── DASHBOARD_EXAMPLES.md          # Visual examples
├── SAMPLE_DATA_README.md          # This file
└── backend/
    └── src/db/
        └── seed.js                # Enhanced seed script
```

---

## ✨ Features

✅ Comprehensive sample data across all dashboards
✅ Realistic metrics and values
✅ Multiple user roles for testing
✅ Various project and task statuses
✅ Burnout and productivity tracking
✅ Peer reviews and compensation data
✅ Leave management
✅ Notifications
✅ Easy to customize
✅ Safe to reset and re-run

---

## 🎉 You're All Set!

Your SkillSync dashboards are now ready with sample data. Start exploring and testing!

**Happy coding! 🚀**
