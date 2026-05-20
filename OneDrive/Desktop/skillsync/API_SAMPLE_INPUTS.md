# SkillSync API - Sample Input Data & Examples

This guide provides sample inputs for all API endpoints in SkillSync. Use these examples to test the system.

---

## 🔐 Authentication Endpoints

### 1. Register New User
**Endpoint:** `POST /api/auth/register`

```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass@123",
  "first_name": "John",
  "last_name": "Doe",
  "department_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "password": "SecurePass@123",
    "first_name": "John",
    "last_name": "Doe",
    "department_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 2. Login
**Endpoint:** `POST /api/auth/login`

```json
{
  "email": "admin@skillsync.ai",
  "password": "Admin@123"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skillsync.ai",
    "password": "Admin@123"
  }'
```

**Response:**
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

---

## 👥 User Management Endpoints

### 3. Get All Users
**Endpoint:** `GET /api/users`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
?page=1&limit=10&department_id=550e8400-e29b-41d4-a716-446655440000&role_id=1
```

---

### 4. Get User by ID
**Endpoint:** `GET /api/users/:id`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 5. Update User Profile
**Endpoint:** `PUT /api/users/:id`

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1-555-0123",
  "avatar_url": "https://example.com/avatar.jpg",
  "skills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
  "metadata": {
    "location": "New York",
    "timezone": "EST",
    "preferred_language": "English"
  }
}
```

**cURL:**
```bash
curl -X PUT http://localhost:5000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-0123",
    "skills": ["React", "Node.js", "TypeScript", "PostgreSQL"]
  }'
```

---

### 6. Delete User
**Endpoint:** `DELETE /api/users/:id`

**Headers:**
```
Authorization: Bearer {token}
```

---

## 🏢 Department Management

### 7. Create Department
**Endpoint:** `POST /api/departments`

```json
{
  "name": "Engineering",
  "description": "Software development and architecture team",
  "manager_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Engineering",
    "description": "Software development and architecture team",
    "manager_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 8. Get All Departments
**Endpoint:** `GET /api/departments`

**Headers:**
```
Authorization: Bearer {token}
```

---

### 9. Update Department
**Endpoint:** `PUT /api/departments/:id`

```json
{
  "name": "Engineering & DevOps",
  "description": "Software development, architecture, and DevOps team",
  "manager_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

## 📋 Project Management

### 10. Create Project
**Endpoint:** `POST /api/projects`

```json
{
  "title": "Mobile App Redesign",
  "description": "Complete redesign of the mobile application with new UI/UX",
  "manager_id": "550e8400-e29b-41d4-a716-446655440000",
  "department_id": "550e8400-e29b-41d4-a716-446655440010",
  "status": "active",
  "priority": "high",
  "start_date": "2026-05-20",
  "deadline": "2026-07-20",
  "budget": 50000.00,
  "tags": ["mobile", "ui-ux", "redesign"]
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "Mobile App Redesign",
    "description": "Complete redesign of the mobile application with new UI/UX",
    "manager_id": "550e8400-e29b-41d4-a716-446655440000",
    "department_id": "550e8400-e29b-41d4-a716-446655440010",
    "status": "active",
    "priority": "high",
    "start_date": "2026-05-20",
    "deadline": "2026-07-20",
    "budget": 50000.00,
    "tags": ["mobile", "ui-ux", "redesign"]
  }'
```

---

### 11. Get All Projects
**Endpoint:** `GET /api/projects`

**Query Parameters:**
```
?page=1&limit=10&status=active&priority=high&department_id=550e8400-e29b-41d4-a716-446655440010
```

---

### 12. Get Project by ID
**Endpoint:** `GET /api/projects/:id`

---

### 13. Update Project
**Endpoint:** `PUT /api/projects/:id`

```json
{
  "title": "Mobile App Redesign - Phase 2",
  "status": "in_progress",
  "priority": "critical",
  "deadline": "2026-08-20",
  "budget": 75000.00
}
```

---

### 14. Add Project Member
**Endpoint:** `POST /api/projects/:id/members`

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "role": "developer"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/projects/550e8400-e29b-41d4-a716-446655440020/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "role": "developer"
  }'
```

---

## ✅ Task Management

### 15. Create Task
**Endpoint:** `POST /api/tasks`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440020",
  "title": "Design Login Screen",
  "description": "Create mockups and design for the new login screen with modern UI",
  "priority": "high",
  "status": "pending",
  "skill_tags": ["UI Design", "Figma", "UX Research"],
  "deadline": "2026-06-15",
  "estimated_hours": 16,
  "created_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "project_id": "550e8400-e29b-41d4-a716-446655440020",
    "title": "Design Login Screen",
    "description": "Create mockups and design for the new login screen with modern UI",
    "priority": "high",
    "status": "pending",
    "skill_tags": ["UI Design", "Figma", "UX Research"],
    "deadline": "2026-06-15",
    "estimated_hours": 16,
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 16. Get All Tasks
**Endpoint:** `GET /api/tasks`

**Query Parameters:**
```
?page=1&limit=20&project_id=550e8400-e29b-41d4-a716-446655440020&status=pending&priority=high
```

---

### 17. Update Task
**Endpoint:** `PUT /api/tasks/:id`

```json
{
  "title": "Design Login Screen - Updated",
  "status": "in_progress",
  "priority": "critical",
  "estimated_hours": 20,
  "actual_hours": 8
}
```

---

### 18. Assign Task to User
**Endpoint:** `POST /api/tasks/:id/assign`

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "assigned_by": "550e8400-e29b-41d4-a716-446655440000",
  "is_primary": true
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440030/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "assigned_by": "550e8400-e29b-41d4-a716-446655440000",
    "is_primary": true
  }'
```

---

### 19. Add Task Comment/Contribution
**Endpoint:** `POST /api/tasks/:id/contributions`

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "content": "I've completed the initial design mockups. Please review and provide feedback.",
  "contribution_type": "comment",
  "file_url": "https://example.com/mockups.pdf",
  "file_name": "login_mockups.pdf",
  "file_size": 2048576
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440030/contributions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "content": "I'\''ve completed the initial design mockups. Please review and provide feedback.",
    "contribution_type": "comment",
    "file_url": "https://example.com/mockups.pdf",
    "file_name": "login_mockups.pdf",
    "file_size": 2048576
  }'
```

---

## 🏖️ Leave Management

### 20. Request Leave
**Endpoint:** `POST /api/leaves`

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "leave_type": "annual",
  "start_date": "2026-06-15",
  "end_date": "2026-06-20",
  "reason": "Family vacation to Europe",
  "status": "pending"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/leaves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "leave_type": "annual",
    "start_date": "2026-06-15",
    "end_date": "2026-06-20",
    "reason": "Family vacation to Europe",
    "status": "pending"
  }'
```

---

### 21. Get All Leave Requests
**Endpoint:** `GET /api/leaves`

**Query Parameters:**
```
?page=1&limit=10&user_id=550e8400-e29b-41d4-a716-446655440001&status=pending
```

---

### 22. Approve/Reject Leave
**Endpoint:** `PUT /api/leaves/:id`

```json
{
  "status": "approved",
  "approved_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Or for rejection:**

```json
{
  "status": "rejected",
  "rejection_reason": "Project deadline conflicts with requested dates"
}
```

---

## ⏱️ Time Tracking

### 23. Log Active Time
**Endpoint:** `POST /api/time-tracking/log`

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "date": "2026-05-20",
  "login_time": "2026-05-20T09:00:00Z",
  "logout_time": "2026-05-20T17:30:00Z",
  "active_minutes": 480,
  "idle_minutes": 30,
  "break_minutes": 60,
  "overtime_minutes": 30,
  "productivity_score": 0.85,
  "app_usage": {
    "VSCode": 240,
    "Chrome": 120,
    "Slack": 60,
    "Figma": 60
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/time-tracking/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "date": "2026-05-20",
    "active_minutes": 480,
    "idle_minutes": 30,
    "break_minutes": 60,
    "overtime_minutes": 30,
    "productivity_score": 0.85,
    "app_usage": {
      "VSCode": 240,
      "Chrome": 120,
      "Slack": 60,
      "Figma": 60
    }
  }'
```

---

### 24. Get Time Tracking Data
**Endpoint:** `GET /api/time-tracking/:user_id`

**Query Parameters:**
```
?start_date=2026-05-01&end_date=2026-05-31&page=1&limit=30
```

---

## 👥 Peer Reviews

### 25. Create Peer Review
**Endpoint:** `POST /api/peer-reviews`

```json
{
  "reviewer_id": "550e8400-e29b-41d4-a716-446655440001",
  "reviewee_id": "550e8400-e29b-41d4-a716-446655440002",
  "project_id": "550e8400-e29b-41d4-a716-446655440020",
  "communication_score": 5,
  "leadership_score": 4,
  "collaboration_score": 5,
  "technical_score": 4,
  "reliability_score": 5,
  "feedback": "Excellent work on the project. Great communication and collaboration with the team. Very reliable and delivers quality work.",
  "is_anonymous": false,
  "period": "Q2-2026"
}
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/peer-reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "reviewer_id": "550e8400-e29b-41d4-a716-446655440001",
    "reviewee_id": "550e8400-e29b-41d4-a716-446655440002",
    "project_id": "550e8400-e29b-41d4-a716-446655440020",
    "communication_score": 5,
    "leadership_score": 4,
    "collaboration_score": 5,
    "technical_score": 4,
    "reliability_score": 5,
    "feedback": "Excellent work on the project. Great communication and collaboration with the team.",
    "is_anonymous": false,
    "period": "Q2-2026"
  }'
```

---

### 26. Get Peer Reviews
**Endpoint:** `GET /api/peer-reviews/:user_id`

**Query Parameters:**
```
?page=1&limit=10&period=Q2-2026
```

---

## 💰 Compensation Management

### 27. Get Compensation Suggestions
**Endpoint:** `GET /api/compensation/suggestions`

**Query Parameters:**
```
?page=1&limit=10&status=pending&suggestion_type=promotion
```

---

### 28. Review Compensation Suggestion
**Endpoint:** `PUT /api/compensation/suggestions/:id`

```json
{
  "status": "approved",
  "reviewed_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Or for rejection:**

```json
{
  "status": "rejected",
  "reviewed_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔥 Burnout Monitoring

### 29. Get Burnout Analysis
**Endpoint:** `GET /api/ai/burnout-analysis`

**Query Parameters:**
```
?department_id=550e8400-e29b-41d4-a716-446655440010&threshold=0.7
```

**Response:**
```json
{
  "success": true,
  "data": {
    "high_risk_employees": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Alice Chen",
        "burnout_score": 0.82,
        "risk_level": "high",
        "indicators": {
          "overtime_hours": 45,
          "task_overload": 12,
          "low_productivity": true,
          "missed_breaks": true
        },
        "recommendations": [
          "Redistribute tasks to reduce workload",
          "Encourage time off",
          "Schedule 1-on-1 with manager"
        ]
      }
    ],
    "medium_risk_employees": [],
    "low_risk_employees": []
  }
}
```

---

## 🤝 Team Chemistry Analysis

### 30. Get Team Chemistry Report
**Endpoint:** `GET /api/ai/team-chemistry`

**Query Parameters:**
```
?project_id=550e8400-e29b-41d4-a716-446655440020
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_chemistry_score": 0.78,
    "team_dynamics": {
      "collaboration": 0.85,
      "communication": 0.72,
      "trust": 0.75,
      "diversity": 0.68
    },
    "member_compatibility": [
      {
        "member1": "Alice Chen",
        "member2": "Bob Martinez",
        "compatibility_score": 0.92,
        "strengths": ["Complementary skills", "Good communication"],
        "areas_to_improve": []
      }
    ],
    "recommendations": [
      "Pair Alice and Bob on critical tasks",
      "Improve communication between Carol and David"
    ]
  }
}
```

---

## 📊 Dashboard Analytics

### 31. Get Dashboard Summary
**Endpoint:** `GET /api/dashboard/summary`

**Query Parameters:**
```
?department_id=550e8400-e29b-41d4-a716-446655440010&date_range=month
```

**Response:**
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

## 🔔 Notifications

### 32. Get Notifications
**Endpoint:** `GET /api/notifications`

**Query Parameters:**
```
?page=1&limit=20&is_read=false
```

---

### 33. Mark Notification as Read
**Endpoint:** `PUT /api/notifications/:id`

```json
{
  "is_read": true
}
```

---

## 🎯 AI Insights

### 32. Get Skill Extraction Analysis
**Endpoint:** `GET /api/ai/skill-extraction`

**Query Parameters:**
```
?user_id=550e8400-e29b-41d4-a716-446655440001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "extracted_skills": [
      {
        "skill": "React",
        "proficiency": "expert",
        "confidence": 0.95,
        "projects_used": 5,
        "years_experience": 3
      },
      {
        "skill": "Node.js",
        "proficiency": "advanced",
        "confidence": 0.88,
        "projects_used": 4,
        "years_experience": 2.5
      }
    ],
    "skill_gaps": [
      {
        "skill": "Kubernetes",
        "importance": "high",
        "recommendation": "Consider training on container orchestration"
      }
    ]
  }
}
```

---

### 33. Get Leave Impact Analysis
**Endpoint:** `GET /api/ai/leave-impact/:leave_id`

**Response:**
```json
{
  "success": true,
  "data": {
    "leave_id": "550e8400-e29b-41d4-a716-446655440040",
    "user_name": "Alice Chen",
    "leave_dates": "2026-06-15 to 2026-06-20",
    "affected_projects": [
      {
        "project_id": "550e8400-e29b-41d4-a716-446655440020",
        "project_name": "Mobile App Redesign",
        "impact_level": "high",
        "critical_tasks": 3,
        "suggested_reassignments": [
          {
            "task_id": "550e8400-e29b-41d4-a716-446655440030",
            "task_name": "Design Login Screen",
            "suggested_assignee": "Carol Williams",
            "confidence": 0.92
          }
        ]
      }
    ],
    "overall_impact": "moderate",
    "recommendations": [
      "Redistribute 3 critical tasks before leave",
      "Brief Carol Williams on project context"
    ]
  }
}
```

---

## 📈 Organizational Insights

### 34. Get Org Insights
**Endpoint:** `GET /api/ai/org-insights`

**Query Parameters:**
```
?department_id=550e8400-e29b-41d4-a716-446655440010&metric=productivity
```

**Response:**
```json
{
  "success": true,
  "data": {
    "department": "Engineering",
    "total_employees": 25,
    "metrics": {
      "average_productivity": 0.78,
      "task_completion_rate": 0.82,
      "project_success_rate": 0.88,
      "employee_satisfaction": 0.75,
      "burnout_risk_percentage": 12
    },
    "trends": {
      "productivity_trend": "increasing",
      "workload_trend": "stable",
      "satisfaction_trend": "decreasing"
    },
    "insights": [
      "Productivity has improved by 5% this quarter",
      "Workload is well-distributed across the team",
      "Employee satisfaction needs attention"
    ],
    "recommendations": [
      "Implement team building activities",
      "Review compensation structure",
      "Provide professional development opportunities"
    ]
  }
}
```

---

## 🧪 Testing All Endpoints

### Quick Test Script (Bash)

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"
TOKEN="your_jwt_token_here"

# Login first to get token
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skillsync.ai",
    "password": "Admin@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Test getting users
curl -s -X GET $BASE_URL/users \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test getting projects
curl -s -X GET $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test getting dashboard summary
curl -s -X GET $BASE_URL/dashboard/summary \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📝 Notes

- Replace `{token}` with actual JWT token from login response
- Replace UUIDs with actual IDs from your database
- All timestamps should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- Dates should be in YYYY-MM-DD format
- All monetary values are in USD
- Scores are decimal values between 0 and 1 (0-100%)
- Status values: pending, in_progress, completed, rejected, approved
- Priority values: low, medium, high, critical
- Leave types: annual, sick, personal, unpaid
- Contribution types: comment, file, update, review

---

## 🚀 Common Workflows

### Workflow 1: Create Project and Assign Tasks

1. Create project: `POST /api/projects`
2. Add team members: `POST /api/projects/:id/members`
3. Create tasks: `POST /api/tasks`
4. Assign tasks: `POST /api/tasks/:id/assign`
5. Track progress: `GET /api/projects/:id`

### Workflow 2: Request and Approve Leave

1. Request leave: `POST /api/leaves`
2. Analyze impact: `GET /api/ai/leave-impact/:leave_id`
3. Reassign tasks: `POST /api/tasks/:id/assign`
4. Approve leave: `PUT /api/leaves/:id`

### Workflow 3: Monitor Team Health

1. Get burnout analysis: `GET /api/ai/burnout-analysis`
2. Get team chemistry: `GET /api/ai/team-chemistry`
3. Review peer feedback: `GET /api/peer-reviews/:user_id`
4. Get org insights: `GET /api/ai/org-insights`

---

## 🔗 Related Documentation

- See `SAMPLE_DATA_GUIDE.md` for demo account credentials
- See `README.md` for setup instructions
- See backend routes for detailed endpoint documentation
