# SkillSync - Complete Testing Guide

This guide provides step-by-step instructions to test all features of SkillSync with real-world scenarios.

---

## 📋 Table of Contents

1. [Setup & Prerequisites](#setup--prerequisites)
2. [Authentication Testing](#authentication-testing)
3. [User Management Testing](#user-management-testing)
4. [Project Management Testing](#project-management-testing)
5. [Task Management Testing](#task-management-testing)
6. [Leave Management Testing](#leave-management-testing)
7. [Time Tracking Testing](#time-tracking-testing)
8. [Peer Reviews Testing](#peer-reviews-testing)
9. [AI Insights Testing](#ai-insights-testing)
10. [Dashboard Testing](#dashboard-testing)

---

## Setup & Prerequisites

### 1. Ensure Services are Running

```bash
# Check backend is running
curl http://localhost:5000/api/health

# Check frontend is running
curl http://localhost:3000
```

### 2. Get Demo Credentials

```
Admin Account:
- Email: admin@skillsync.ai
- Password: Admin@123

Manager Account:
- Email: manager@skillsync.ai
- Password: Manager@123

Employee Accounts:
- alice@skillsync.ai / Employee@123
- bob@skillsync.ai / Employee@123
- carol@skillsync.ai / Employee@123
- david@skillsync.ai / Employee@123
- eve@skillsync.ai / Employee@123
```

### 3. Install Postman (Optional but Recommended)

- Download from: https://www.postman.com/downloads/
- Import `SkillSync_API.postman_collection.json`

---

## Authentication Testing

### Test 1: Admin Login

**Objective:** Verify admin can login and receive JWT token

**Steps:**

1. Open Postman or use curl:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skillsync.ai",
    "password": "Admin@123"
  }'
```

2. Expected Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@skillsync.ai",
    "first_name": "System",
    "last_name": "Admin",
    "role_id": 3
  }
}
```

3. **Save the token** for subsequent requests

---

### Test 2: Employee Login

**Objective:** Verify employee can login

**Steps:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@skillsync.ai",
    "password": "Employee@123"
  }'
```

**Expected:** Employee receives token with role_id = 1

---

### Test 3: Invalid Credentials

**Objective:** Verify system rejects invalid credentials

**Steps:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skillsync.ai",
    "password": "WrongPassword"
  }'
```

**Expected:** Error response with 401 status

---

## User Management Testing

### Test 4: Get All Users

**Objective:** Retrieve list of all users

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=10" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns array of 5+ users with pagination

---

### Test 5: Get Specific User

**Objective:** Retrieve details of a specific user

**Steps:**

```bash
# Get Alice's details
curl -X GET "http://localhost:5000/api/users/550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns user object with skills array

---

### Test 6: Update User Profile

**Objective:** Update user information

**Steps:**

```bash
curl -X PUT "http://localhost:5000/api/users/550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "first_name": "Alice",
    "last_name": "Chen",
    "phone": "+1-555-0100",
    "skills": ["React", "TypeScript", "Node.js", "GraphQL", "Docker"],
    "metadata": {
      "location": "San Francisco",
      "timezone": "PST",
      "years_experience": 5
    }
  }'
```

**Expected:** User profile updated successfully

---

## Project Management Testing

### Test 7: Create New Project

**Objective:** Create a new project

**Steps:**

```bash
curl -X POST "http://localhost:5000/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "title": "AI Dashboard Development",
    "description": "Build advanced analytics dashboard with AI-powered insights",
    "manager_id": "550e8400-e29b-41d4-a716-446655440000",
    "department_id": "550e8400-e29b-41d4-a716-446655440010",
    "status": "active",
    "priority": "high",
    "start_date": "2026-05-20",
    "deadline": "2026-08-20",
    "budget": 100000.00,
    "tags": ["AI", "Analytics", "Dashboard"]
  }'
```

**Expected:** Project created with ID returned

**Save the project ID** for next tests

---

### Test 8: Get All Projects

**Objective:** Retrieve all projects with filters

**Steps:**

```bash
# Get all active projects
curl -X GET "http://localhost:5000/api/projects?page=1&limit=10&status=active&priority=high" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns array of projects

---

### Test 9: Add Team Members to Project

**Objective:** Add employees to project

**Steps:**

```bash
# Add Alice to project
curl -X POST "http://localhost:5000/api/projects/{PROJECT_ID}/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "role": "developer"
  }'

# Add Bob to project
curl -X POST "http://localhost:5000/api/projects/{PROJECT_ID}/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "role": "developer"
  }'

# Add Carol to project
curl -X POST "http://localhost:5000/api/projects/{PROJECT_ID}/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "role": "designer"
  }'
```

**Expected:** Team members added successfully

---

## Task Management Testing

### Test 10: Create Tasks

**Objective:** Create multiple tasks for the project

**Steps:**

```bash
# Task 1: Backend API Development
curl -X POST "http://localhost:5000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "project_id": "{PROJECT_ID}",
    "title": "Develop REST API Endpoints",
    "description": "Create all necessary API endpoints for dashboard data retrieval",
    "priority": "high",
    "status": "pending",
    "skill_tags": ["Node.js", "Express", "PostgreSQL", "REST API"],
    "deadline": "2026-06-15",
    "estimated_hours": 40,
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Task 2: Frontend UI Development
curl -X POST "http://localhost:5000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "project_id": "{PROJECT_ID}",
    "title": "Design Dashboard UI Components",
    "description": "Create reusable React components for dashboard",
    "priority": "high",
    "status": "pending",
    "skill_tags": ["React", "TypeScript", "Tailwind CSS", "UI Design"],
    "deadline": "2026-06-20",
    "estimated_hours": 32,
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Task 3: Database Optimization
curl -X POST "http://localhost:5000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "project_id": "{PROJECT_ID}",
    "title": "Optimize Database Queries",
    "description": "Add indexes and optimize slow queries",
    "priority": "medium",
    "status": "pending",
    "skill_tags": ["PostgreSQL", "Database Design", "Performance Tuning"],
    "deadline": "2026-07-01",
    "estimated_hours": 16,
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected:** Tasks created with IDs returned

**Save task IDs** for assignment

---

### Test 11: Assign Tasks to Team Members

**Objective:** Assign tasks to employees

**Steps:**

```bash
# Assign API task to Bob
curl -X POST "http://localhost:5000/api/tasks/{TASK_ID_1}/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "assigned_by": "550e8400-e29b-41d4-a716-446655440000",
    "is_primary": true
  }'

# Assign UI task to Carol
curl -X POST "http://localhost:5000/api/tasks/{TASK_ID_2}/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "assigned_by": "550e8400-e29b-41d4-a716-446655440000",
    "is_primary": true
  }'

# Assign DB task to Alice
curl -X POST "http://localhost:5000/api/tasks/{TASK_ID_3}/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "assigned_by": "550e8400-e29b-41d4-a716-446655440000",
    "is_primary": true
  }'
```

**Expected:** Tasks assigned successfully

---

### Test 12: Update Task Status

**Objective:** Update task progress

**Steps:**

```bash
# Move API task to in_progress
curl -X PUT "http://localhost:5000/api/tasks/{TASK_ID_1}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "status": "in_progress",
    "actual_hours": 8
  }'

# Move UI task to in_progress
curl -X PUT "http://localhost:5000/api/tasks/{TASK_ID_2}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "status": "in_progress",
    "actual_hours": 6
  }'

# Complete DB task
curl -X PUT "http://localhost:5000/api/tasks/{TASK_ID_3}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "status": "completed",
    "actual_hours": 14
  }'
```

**Expected:** Task statuses updated

---

### Test 13: Add Task Comments

**Objective:** Add comments/contributions to tasks

**Steps:**

```bash
# Bob adds comment on API task
curl -X POST "http://localhost:5000/api/tasks/{TASK_ID_1}/contributions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "content": "Completed authentication endpoints. Ready for review.",
    "contribution_type": "comment"
  }'

# Carol adds file contribution
curl -X POST "http://localhost:5000/api/tasks/{TASK_ID_2}/contributions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "content": "UI mockups and component library completed",
    "contribution_type": "file",
    "file_url": "https://example.com/ui-components.zip",
    "file_name": "ui-components.zip",
    "file_size": 5242880
  }'
```

**Expected:** Comments added successfully

---

## Leave Management Testing

### Test 14: Request Leave

**Objective:** Submit leave request

**Steps:**

```bash
# Alice requests annual leave
curl -X POST "http://localhost:5000/api/leaves" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "leave_type": "annual",
    "start_date": "2026-06-15",
    "end_date": "2026-06-20",
    "reason": "Summer vacation",
    "status": "pending"
  }'

# Bob requests sick leave
curl -X POST "http://localhost:5000/api/leaves" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "leave_type": "sick",
    "start_date": "2026-05-25",
    "end_date": "2026-05-26",
    "reason": "Medical appointment",
    "status": "pending"
  }'
```

**Expected:** Leave requests created

**Save leave IDs** for next tests

---

### Test 15: Get Leave Impact Analysis

**Objective:** Analyze impact of leave on projects

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/ai/leave-impact/{LEAVE_ID}" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "leave_id": "...",
    "user_name": "Alice Chen",
    "leave_dates": "2026-06-15 to 2026-06-20",
    "affected_projects": [
      {
        "project_name": "AI Dashboard Development",
        "impact_level": "high",
        "critical_tasks": 2,
        "suggested_reassignments": [...]
      }
    ],
    "recommendations": [...]
  }
}
```

---

### Test 16: Approve Leave

**Objective:** Manager approves leave request

**Steps:**

```bash
curl -X PUT "http://localhost:5000/api/leaves/{LEAVE_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "status": "approved",
    "approved_by": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected:** Leave approved

---

## Time Tracking Testing

### Test 17: Log Active Time

**Objective:** Record employee activity

**Steps:**

```bash
# Log Alice's time for today
curl -X POST "http://localhost:5000/api/time-tracking/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "date": "2026-05-20",
    "active_minutes": 480,
    "idle_minutes": 20,
    "break_minutes": 60,
    "overtime_minutes": 0,
    "productivity_score": 0.88,
    "app_usage": {
      "VSCode": 240,
      "Chrome": 120,
      "Slack": 80,
      "Figma": 40
    }
  }'

# Log Bob's time
curl -X POST "http://localhost:5000/api/time-tracking/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "date": "2026-05-20",
    "active_minutes": 520,
    "idle_minutes": 30,
    "break_minutes": 50,
    "overtime_minutes": 60,
    "productivity_score": 0.82,
    "app_usage": {
      "VSCode": 300,
      "Chrome": 100,
      "Slack": 60,
      "Postman": 60
    }
  }'
```

**Expected:** Time logs recorded

---

### Test 18: Get Time Tracking Report

**Objective:** View employee time tracking data

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/time-tracking/550e8400-e29b-41d4-a716-446655440001?start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns time tracking data for the month

---

## Peer Reviews Testing

### Test 19: Create Peer Reviews

**Objective:** Team members review each other

**Steps:**

```bash
# Alice reviews Bob
curl -X POST "http://localhost:5000/api/peer-reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "reviewer_id": "550e8400-e29b-41d4-a716-446655440001",
    "reviewee_id": "550e8400-e29b-41d4-a716-446655440002",
    "project_id": "{PROJECT_ID}",
    "communication_score": 4,
    "leadership_score": 4,
    "collaboration_score": 5,
    "technical_score": 5,
    "reliability_score": 4,
    "feedback": "Bob is a great developer with excellent technical skills. Very reliable and delivers quality code.",
    "is_anonymous": false,
    "period": "Q2-2026"
  }'

# Bob reviews Carol
curl -X POST "http://localhost:5000/api/peer-reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "reviewer_id": "550e8400-e29b-41d4-a716-446655440002",
    "reviewee_id": "550e8400-e29b-41d4-a716-446655440003",
    "project_id": "{PROJECT_ID}",
    "communication_score": 5,
    "leadership_score": 4,
    "collaboration_score": 5,
    "technical_score": 4,
    "reliability_score": 5,
    "feedback": "Carol has excellent design skills and great communication. Very collaborative team player.",
    "is_anonymous": false,
    "period": "Q2-2026"
  }'

# Carol reviews Alice
curl -X POST "http://localhost:5000/api/peer-reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{
    "reviewer_id": "550e8400-e29b-41d4-a716-446655440003",
    "reviewee_id": "550e8400-e29b-41d4-a716-446655440001",
    "project_id": "{PROJECT_ID}",
    "communication_score": 5,
    "leadership_score": 5,
    "collaboration_score": 5,
    "technical_score": 5,
    "reliability_score": 5,
    "feedback": "Alice is an exceptional team lead. Great technical knowledge, excellent communication, and very reliable.",
    "is_anonymous": false,
    "period": "Q2-2026"
  }'
```

**Expected:** Peer reviews created

---

### Test 20: Get Peer Reviews

**Objective:** View peer reviews for an employee

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/peer-reviews/550e8400-e29b-41d4-a716-446655440001?page=1&limit=10&period=Q2-2026" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns reviews received by Alice

---

## AI Insights Testing

### Test 21: Get Burnout Analysis

**Objective:** Analyze burnout risk across team

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/ai/burnout-analysis?department_id=550e8400-e29b-41d4-a716-446655440010&threshold=0.7" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "high_risk_employees": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Bob Martinez",
        "burnout_score": 0.78,
        "risk_level": "high",
        "indicators": {
          "overtime_hours": 60,
          "task_overload": true,
          "low_productivity": false,
          "missed_breaks": true
        },
        "recommendations": [
          "Redistribute tasks to reduce workload",
          "Encourage time off",
          "Monitor closely"
        ]
      }
    ],
    "medium_risk_employees": [],
    "low_risk_employees": [...]
  }
}
```

---

### Test 22: Get Team Chemistry

**Objective:** Analyze team dynamics

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/ai/team-chemistry?project_id={PROJECT_ID}" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "overall_chemistry_score": 0.85,
    "team_dynamics": {
      "collaboration": 0.88,
      "communication": 0.82,
      "trust": 0.85,
      "diversity": 0.80
    },
    "member_compatibility": [
      {
        "member1": "Alice Chen",
        "member2": "Bob Martinez",
        "compatibility_score": 0.90,
        "strengths": ["Complementary skills", "Good communication"],
        "areas_to_improve": []
      }
    ],
    "recommendations": [...]
  }
}
```

---

### Test 23: Get Skill Extraction

**Objective:** Analyze employee skills

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/ai/skill-extraction?user_id=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns extracted skills with proficiency levels

---

### Test 24: Get Org Insights

**Objective:** Get organizational metrics

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/ai/org-insights?department_id=550e8400-e29b-41d4-a716-446655440010&metric=productivity" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected:** Returns department metrics and trends

---

## Dashboard Testing

### Test 25: Get Dashboard Summary

**Objective:** View dashboard overview

**Steps:**

```bash
curl -X GET "http://localhost:5000/api/dashboard/summary?department_id=550e8400-e29b-41d4-a716-446655440010&date_range=month" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total_employees": 25,
    "active_projects": 5,
    "total_tasks": 87,
    "completed_tasks": 45,
    "pending_tasks": 32,
    "overdue_tasks": 10,
    "average_productivity": 0.78,
    "burnout_risk_count": 3,
    "pending_leaves": 5,
    "team_health_score": 0.75
  }
}
```

---

## 🧪 Automated Testing Script

Save this as `test_skillsync.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Login and get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skillsync.ai",
    "password": "Admin@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: $TOKEN"

# Test endpoints
echo -e "\n📊 Testing endpoints..."

# Get users
echo -n "Getting users... "
USERS=$(curl -s -X GET "$BASE_URL/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")
if echo $USERS | grep -q "email"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Get projects
echo -n "Getting projects... "
PROJECTS=$(curl -s -X GET "$BASE_URL/projects?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")
if echo $PROJECTS | grep -q "title"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Get dashboard
echo -n "Getting dashboard summary... "
DASHBOARD=$(curl -s -X GET "$BASE_URL/dashboard/summary" \
  -H "Authorization: Bearer $TOKEN")
if echo $DASHBOARD | grep -q "total_employees"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Get burnout analysis
echo -n "Getting burnout analysis... "
BURNOUT=$(curl -s -X GET "$BASE_URL/ai/burnout-analysis" \
  -H "Authorization: Bearer $TOKEN")
if echo $BURNOUT | grep -q "high_risk_employees"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

echo -e "\n${GREEN}✅ All tests completed!${NC}"
```

Run with:
```bash
chmod +x test_skillsync.sh
./test_skillsync.sh
```

---

## 📝 Checklist

- [ ] Authentication working
- [ ] User management functional
- [ ] Projects can be created and managed
- [ ] Tasks can be assigned and tracked
- [ ] Leave requests working
- [ ] Time tracking logging data
- [ ] Peer reviews being recorded
- [ ] AI insights generating analysis
- [ ] Dashboard showing correct metrics
- [ ] All endpoints responding correctly

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized

**Solution:** Token expired or invalid. Login again and get new token.

### Issue: 404 Not Found

**Solution:** Check endpoint URL and IDs are correct.

### Issue: 500 Internal Server Error

**Solution:** Check backend logs:
```bash
# Check backend logs
tail -f backend/logs/error.log
```

### Issue: Database Connection Error

**Solution:** Ensure PostgreSQL is running:
```bash
# Check PostgreSQL status
psql -U postgres -d skillsync -c "SELECT 1"
```

---

## 📚 Additional Resources

- API Documentation: `API_SAMPLE_INPUTS.md`
- Sample Data Guide: `SAMPLE_DATA_GUIDE.md`
- Postman Collection: `SkillSync_API.postman_collection.json`

