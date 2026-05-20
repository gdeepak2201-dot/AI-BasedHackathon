# SkillSync Quick Start - Sample Data

## 🚀 Get Started in 3 Steps

### Step 1: Setup Database
```bash
cd backend
node src/db/setup.js      # Create database
node src/db/migrate.js    # Create tables
node src/db/seed.js       # Populate sample data
```

### Step 2: Start Backend
```bash
npm start
# Server runs on http://localhost:5000
```

### Step 3: Start Frontend
```bash
cd frontend
npm start
# App runs on http://localhost:3000
```

---

## 👥 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@skillsync.ai | Admin@123 |
| **Manager** | manager@skillsync.ai | Manager@123 |
| **Employee** | alice@skillsync.ai | Employee@123 |
| **Employee** | bob@skillsync.ai | Employee@123 |
| **Employee** | carol@skillsync.ai | Employee@123 |
| **Employee** | david@skillsync.ai | Employee@123 |
| **Employee** | eve@skillsync.ai | Employee@123 |

---

## 📊 What's in the Sample Data?

### Users
- ✅ 1 Admin
- ✅ 1 Manager (Sarah Johnson)
- ✅ 5 Employees across 3 departments

### Projects
- ✅ 4 Projects (3 active, 1 planning)
- ✅ All with realistic timelines and priorities

### Tasks
- ✅ 15 Tasks across projects
- ✅ Various statuses: Pending, In Progress, Review, Completed
- ✅ Assigned to employees with priorities

### Work Tracking
- ✅ Active time logs (last 5 days)
- ✅ Productivity scores (60-100%)
- ✅ Overtime tracking
- ✅ Workload metrics for current week

### Employee Wellbeing
- ✅ Burnout risk scores (20-80%)
- ✅ Workload analysis
- ✅ Stress indicators

### Team Management
- ✅ Peer reviews with scores
- ✅ Leave requests (pending & approved)
- ✅ Compensation suggestions
- ✅ Notifications

---

## 🎯 Dashboard Views

### Employee Dashboard
Login as: **alice@skillsync.ai**
- View your active tasks
- See your wellbeing score
- Check this week's productivity
- View upcoming deadlines

### Manager Dashboard
Login as: **manager@skillsync.ai**
- Monitor team projects
- Track team productivity
- View burnout alerts
- See task distribution
- Check leave requests

### Admin Dashboard
Login as: **admin@skillsync.ai**
- Organization-wide overview
- Department statistics
- AI agent performance
- System health metrics

---

## 📈 Sample Data Statistics

| Metric | Value |
|--------|-------|
| Total Users | 7 (1 admin, 1 manager, 5 employees) |
| Total Projects | 4 |
| Total Tasks | 15 |
| Active Time Logs | 25 (5 days × 5 employees) |
| Workload Logs | 5 (1 per employee) |
| Peer Reviews | ~10 (random cross-team) |
| Leave Requests | ~2 (random) |
| Notifications | 15 (3 per employee) |

---

## 🔍 Key Features to Test

### 1. Task Management
- [ ] View tasks in different statuses
- [ ] Check task priorities
- [ ] See task assignments
- [ ] View upcoming deadlines

### 2. Burnout Monitoring
- [ ] Check wellbeing scores
- [ ] View burnout risk levels
- [ ] See recommendations
- [ ] Monitor team alerts

### 3. Time Tracking
- [ ] View active hours
- [ ] Check productivity scores
- [ ] Monitor overtime
- [ ] See weekly trends

### 4. Leave Management
- [ ] View pending leave requests
- [ ] Check approved leaves
- [ ] See impact analysis
- [ ] Manage team availability

### 5. Compensation
- [ ] View suggestions
- [ ] Check performance scores
- [ ] See rationale
- [ ] Review recommendations

### 6. Peer Reviews
- [ ] View received reviews
- [ ] Check scores
- [ ] Read feedback
- [ ] See team insights

---

## 🛠️ Customization

### Add More Employees
Edit `backend/src/db/seed.js` and add to the `employees` array:
```javascript
{ 
  email: 'newuser@skillsync.ai', 
  first: 'First', 
  last: 'Last', 
  dept: 'Engineering', 
  skills: ['skill1', 'skill2'] 
}
```

### Change Burnout Scores
Modify line in seed.js:
```javascript
const burnoutRisk = Math.random() * 0.6 + 0.2; // Change range here
```

### Add More Projects
Add to the projects INSERT statement in seed.js

### Reset Database
```bash
# Drop and recreate
node src/db/setup.js
node src/db/migrate.js
node src/db/seed.js
```

---

## 📝 Notes

- All sample data is randomly generated but realistic
- Dates are relative to today (tasks, leaves, etc.)
- Scores and metrics are within realistic ranges
- Data is safe to modify and reset
- Seed script is idempotent (safe to run multiple times)

---

## 🐛 Troubleshooting

**No data showing?**
- Verify seed script completed successfully
- Check database connection in `.env`
- Ensure you're logged in with correct role

**Want fresh data?**
- Run seed script again (it's safe)
- Or reset database completely (see above)

**Need more data?**
- Edit seed.js to add more employees/projects/tasks
- Run seed script again

---

## 📚 Full Documentation

See `SAMPLE_DATA_GUIDE.md` for detailed information about all sample data.
