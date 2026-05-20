# SkillSync - AI-Based HR Management System

![SkillSync](https://img.shields.io/badge/SkillSync-v1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![React](https://img.shields.io/badge/React-v18+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14+-336791)
![License](https://img.shields.io/badge/License-MIT-green)

An intelligent HR management system powered by AI agents that provides comprehensive employee management, project tracking, burnout monitoring, and organizational insights.

---

## 🎯 Features

### 👥 Employee Management
- User profiles with skills tracking
- Department organization
- Role-based access control
- Employee directory with search

### 📊 Project Management
- Create and manage projects
- Team member assignment
- Project progress tracking
- Budget management
- Milestone tracking

### ✅ Task Management
- Task creation and assignment
- Priority and status tracking
- Time estimation and tracking
- Task dependencies
- Comments and file attachments
- Kanban board view

### 🏖️ Leave Management
- Leave request submission
- Manager approval workflow
- AI-powered impact analysis
- Automatic task reassignment suggestions
- Leave calendar

### ⏱️ Time Tracking
- Active time logging
- Productivity scoring
- App usage tracking
- Overtime monitoring
- Weekly workload analysis

### 👥 Peer Reviews
- Anonymous and attributed reviews
- Multi-dimensional scoring
- Feedback collection
- Performance analytics

### 💰 Compensation Management
- AI-powered salary recommendations
- Performance-based suggestions
- Promotion recommendations
- Equity analysis

### 🤖 AI-Powered Insights

#### Burnout Monitoring Agent
- Real-time burnout risk assessment
- Workload analysis
- Stress indicator detection
- Intervention recommendations

#### Team Chemistry Agent
- Team compatibility analysis
- Collaboration metrics
- Communication patterns
- Optimal team composition

#### Skill Extraction Agent
- Automatic skill identification
- Proficiency level assessment
- Skill gap analysis
- Training recommendations

#### Leave Impact Agent
- Project impact analysis
- Task reassignment suggestions
- Coverage planning
- Risk assessment

#### Compensation Agent
- Fair pay analysis
- Market comparison
- Performance-based recommendations
- Promotion suggestions

#### Organizational Insights Agent
- Department-level analytics
- Productivity trends
- Employee satisfaction metrics
- Strategic recommendations

### 📈 Dashboard
- Real-time metrics
- Team health score
- Project status overview
- Employee analytics
- Burnout risk indicators
- Compensation insights

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/gdeepak2201-dot/AI-BasedHackathon.git
cd skillsync
```

2. **Setup Backend**
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update database credentials in .env
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=skillsync
# DB_USER=postgres
# DB_PASSWORD=your_password

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start backend
npm run dev
```

3. **Setup Frontend**
```bash
cd ../frontend

# Install dependencies
npm install

# Start frontend
npm start
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 📚 Documentation

### Getting Started
- [Sample Data Guide](./SAMPLE_DATA_GUIDE.md) - Demo accounts and sample data
- [API Sample Inputs](./API_SAMPLE_INPUTS.md) - Complete API endpoint examples
- [Testing Guide](./TESTING_GUIDE.md) - Step-by-step testing instructions

### API Documentation
- [Postman Collection](./SkillSync_API.postman_collection.json) - Import into Postman for easy testing

### Database
- Schema: See `backend/src/db/migrate.js`
- Seed data: See `backend/src/db/seed.js`

---

## 🔐 Demo Accounts

### Admin
- **Email:** admin@skillsync.ai
- **Password:** Admin@123
- **Access:** Full system access

### Manager
- **Email:** manager@skillsync.ai
- **Password:** Manager@123
- **Access:** Team management, project oversight

### Employees
- **alice@skillsync.ai** / Employee@123 - Engineering
- **bob@skillsync.ai** / Employee@123 - Engineering
- **carol@skillsync.ai** / Employee@123 - Product
- **david@skillsync.ai** / Employee@123 - Data Science
- **eve@skillsync.ai** / Employee@123 - Engineering

---

## 📊 Sample Data Included

### Departments (4)
- Engineering
- Product
- Data Science
- Operations

### Employees (5+)
- With diverse skills
- Different departments
- Various experience levels

### Projects (4)
- Active projects with different statuses
- Team assignments
- Budget allocation

### Tasks (15+)
- Various priorities and statuses
- Skill requirements
- Time estimates

### Additional Data
- Time tracking logs
- Workload metrics
- Peer reviews
- Leave requests
- Compensation suggestions
- Notifications

---

## 🏗️ Architecture

### Backend Stack
- **Framework:** Express.js
- **Database:** PostgreSQL (primary), Neo4j (graph), ChromaDB (vector)
- **Authentication:** JWT
- **Real-time:** Socket.io
- **Logging:** Winston
- **Validation:** Joi

### Frontend Stack
- **Framework:** React 18
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Real-time:** Socket.io-client

### AI Agents
- Burnout monitoring
- Team chemistry analysis
- Skill extraction
- Leave impact analysis
- Compensation recommendations
- Organizational insights

---

## 📁 Project Structure

```
skillsync/
├── backend/
│   ├── src/
│   │   ├── agents/          # AI agents
│   │   ├── db/              # Database setup & migrations
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── socket/          # WebSocket handlers
│   │   ├── utils/           # Utilities
│   │   └── server.js        # Main server file
│   ├── logs/                # Application logs
│   ├── uploads/             # File uploads
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── API_SAMPLE_INPUTS.md
├── TESTING_GUIDE.md
├── SAMPLE_DATA_GUIDE.md
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/members` - Add team member

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get all tasks
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/assign` - Assign task
- `POST /api/tasks/:id/contributions` - Add comment

### Leaves
- `POST /api/leaves` - Request leave
- `GET /api/leaves` - Get leave requests
- `PUT /api/leaves/:id` - Approve/reject leave

### Time Tracking
- `POST /api/time-tracking/log` - Log active time
- `GET /api/time-tracking/:user_id` - Get time logs

### Peer Reviews
- `POST /api/peer-reviews` - Create review
- `GET /api/peer-reviews/:user_id` - Get reviews

### AI Insights
- `GET /api/ai/burnout-analysis` - Burnout analysis
- `GET /api/ai/team-chemistry` - Team chemistry
- `GET /api/ai/skill-extraction` - Skill analysis
- `GET /api/ai/leave-impact/:id` - Leave impact
- `GET /api/ai/org-insights` - Org insights

### Dashboard
- `GET /api/dashboard/summary` - Dashboard metrics

---

## 🧪 Testing

### Using Postman
1. Import `SkillSync_API.postman_collection.json`
2. Set `token` variable after login
3. Test endpoints

### Using cURL
See [API_SAMPLE_INPUTS.md](./API_SAMPLE_INPUTS.md) for examples

### Automated Testing
See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for step-by-step instructions

---

## 🐳 Docker Deployment

### Build and Run with Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📊 Database Setup

### Create Database
```bash
psql -U postgres -c "CREATE DATABASE skillsync;"
```

### Run Migrations
```bash
cd backend
npm run migrate
```

### Seed Sample Data
```bash
npm run seed
```

---

## 🔧 Configuration

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/skillsync
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillsync
DB_USER=postgres
DB_PASSWORD=password

# Optional Services
NEO4J_URI=bolt://localhost:7687
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

---

## 📈 Performance Metrics

### Dashboard Metrics
- Total employees
- Active projects
- Task completion rate
- Average productivity
- Burnout risk count
- Team health score

### AI Insights
- Burnout risk scores (0-1)
- Team chemistry score (0-1)
- Skill proficiency levels
- Leave impact assessment
- Compensation recommendations

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🙋 Support

For issues and questions:
1. Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for troubleshooting
2. Review [API_SAMPLE_INPUTS.md](./API_SAMPLE_INPUTS.md) for API usage
3. Check backend logs: `tail -f backend/logs/error.log`

---

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core HR management
- ✅ Project & task tracking
- ✅ AI-powered insights
- ✅ Dashboard & analytics

### Phase 2 (Planned)
- Mobile app
- Advanced reporting
- Integration with external tools
- Machine learning improvements

### Phase 3 (Future)
- Predictive analytics
- Advanced automation
- Custom workflows
- Enterprise features

---

## 👨‍💻 Team

**Developed by:** Deepak G
**Project:** AI-Based Hackathon
**Repository:** https://github.com/gdeepak2201-dot/AI-BasedHackathon

---

## 📞 Contact

- GitHub: [@gdeepak2201-dot](https://github.com/gdeepak2201-dot)
- Email: deepak@example.com

---

## 🙏 Acknowledgments

- Express.js community
- React community
- PostgreSQL documentation
- All contributors and testers

---

## 📅 Changelog

### v1.0.0 (Current)
- Initial release
- Core features implemented
- AI agents integrated
- Dashboard functional
- Sample data included

---

**Last Updated:** May 20, 2026

For the latest updates, visit: https://github.com/gdeepak2201-dot/AI-BasedHackathon
