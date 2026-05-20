# SkillSync Quick Start Guide

## System Status

✅ **Backend**: Running on `http://localhost:5000`
✅ **Frontend**: Running on `http://localhost:3000`
✅ **Database**: PostgreSQL connected with 500+ sample records
✅ **Team Members Feature**: Fully integrated and ready

## Getting Started

### Step 1: Access the Application
Open your browser and go to: **http://localhost:3000**

### Step 2: Login with Demo Account

#### Option A: Manager Account (Recommended for Team Members Feature)
- **Email**: `manager@skillsync.ai`
- **Password**: `Manager@123`

#### Option B: Admin Account
- **Email**: `admin@skillsync.ai`
- **Password**: `Admin@123`

#### Option C: Employee Account
- **Email**: `alice@skillsync.ai` (or any employee)
- **Password**: `Employee@123`

### Step 3: Navigate to Team Members

#### From Manager Dashboard:
1. After login, you'll see the Manager Dashboard
2. Scroll down to "Quick Actions" section
3. Click the **"Team Members"** button (blue gradient)
4. Or directly visit: `http://localhost:3000/team-members`

#### From Navigation:
- The Team Members page is accessible only to Managers and Admins
- Employees cannot access this page

## Team Members Feature Overview

### What You'll See
- **Grid of 20 Employees** across 4 departments
- **Search Bar** - Search by name or email
- **Sort Options** - Sort by name, email, or skills
- **Expandable Cards** - Click any card to see more details
- **Statistics** - Total members, active count, average skills

### Features to Try

#### 1. Search
- Type "Alice" in the search box
- Type "engineering" to find engineering team members
- Type an email address

#### 2. Sort
- Click "Sort by Name" dropdown
- Try "Sort by Email"
- Try "Sort by Skills" to see who has the most skills

#### 3. Expand Cards
- Click on any employee card to expand it
- See hire date, status, location, timezone
- Click "View Profile" button (for future enhancement)

#### 4. View Statistics
- Bottom of page shows:
  - Total team members (20)
  - Active members count
  - Average skills per member

## Sample Data Overview

### Employees (20 total)
- **Engineering**: Alice, Bob, Charlie, Diana, Eve, Frank
- **Product**: Grace, Henry, Iris, Jack, Karen
- **Sales**: Leo, Mia, Noah, Olivia, Peter
- **HR**: Quinn, Rachel, Sam, Tina

### Each Employee Has:
- Full name and email
- Phone number
- 3-8 skills (e.g., React, Python, Leadership, etc.)
- Hire date
- Active status
- Department assignment

### Skills Examples:
- Technical: React, Python, Node.js, PostgreSQL, AWS
- Soft: Leadership, Communication, Problem-solving
- Domain: Sales, Marketing, HR, Finance

## Dashboard Overview

### Manager Dashboard Features
1. **Active Projects** - Number of ongoing projects
2. **Team Members** - Total team size
3. **Pending Leaves** - Leave requests awaiting approval
4. **On Leave Today** - Employees on leave
5. **Burnout Risk Alerts** - Employees at risk
6. **Task Distribution** - Pie chart of task statuses
7. **Team Productivity** - Average productivity percentage
8. **AI Org Insights** - AI-generated organizational insights
9. **Quick Actions** - Fast access to key features

### Quick Actions Available
- **Team Members** - View all employees (NEW!)
- **Team Chemistry** - Analyze team dynamics
- **Burnout Monitor** - Track employee burnout
- **Compensation** - Review compensation suggestions
- **Leave Requests** - Manage leave approvals

## Other Features to Explore

### For Managers:
1. **Projects** - View and manage projects
2. **Kanban Board** - Drag-and-drop task management
3. **AI Insights** - Get AI-powered recommendations
4. **Team Analytics** - Analyze team performance
5. **Burnout Monitor** - Monitor team health
6. **Compensation Dashboard** - Review compensation data
7. **Leave Management** - Approve/reject leave requests

### For Employees:
1. **Dashboard** - Personal overview
2. **Projects** - View assigned projects
3. **Tasks** - See assigned tasks
4. **Time Tracking** - Log work hours
5. **Peer Reviews** - Give and receive feedback
6. **Leave Management** - Request time off
7. **Profile** - Update personal information

## API Endpoints

### Team Members Endpoint
```
GET /api/users
Authorization: Bearer {token}
Query Parameters:
  - limit: 100 (default: 50)
  - page: 1 (default: 1)
  - search: "name or email"
  - departmentId: "department_id"
  - role: "role_name"

Response:
{
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "first_name": "First",
      "last_name": "Last",
      "avatar_url": "url",
      "skills": ["skill1", "skill2"],
      "hire_date": "2024-01-15",
      "role": "Employee",
      "department": "Engineering",
      "department_id": "dept_id"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 20
  }
}
```

## Troubleshooting

### Issue: Can't access Team Members page
**Solution**: Make sure you're logged in as a Manager or Admin

### Issue: No employees showing
**Solution**: 
1. Check backend is running: `npm run dev` in backend folder
2. Check database connection in logs
3. Verify sample data was seeded

### Issue: Search not working
**Solution**: 
1. Make sure you're typing in the search box
2. Try searching by exact name or email
3. Refresh the page

### Issue: Backend not starting
**Solution**:
1. Kill existing node processes: `taskkill /F /IM node.exe`
2. Run: `npm run dev` in backend folder
3. Check port 5000 is available

### Issue: Frontend not loading
**Solution**:
1. Kill existing node processes: `taskkill /F /IM node.exe`
2. Run: `npm start` in frontend folder
3. Check port 3000 is available

## Performance Tips

- **Search is real-time** - Results update as you type
- **Data auto-refreshes** - Every 60 seconds
- **Caching enabled** - Faster subsequent loads
- **Pagination ready** - Can handle 1000+ employees

## Next Steps

1. **Explore all features** - Try different dashboards and pages
2. **Test with different roles** - Login as employee, manager, admin
3. **Check AI insights** - See AI-generated recommendations
4. **Review sample data** - Understand the data structure
5. **Plan customizations** - Identify features to enhance

## Support

For issues or questions:
1. Check the logs in `backend/logs/` folder
2. Review API documentation in `API_SAMPLE_INPUTS.md`
3. Check database setup in `backend/src/db/seed.js`
4. Review component code in `frontend/src/pages/`

---

**Last Updated**: May 20, 2026
**Version**: 1.0.0
**Status**: ✅ Ready for Use
