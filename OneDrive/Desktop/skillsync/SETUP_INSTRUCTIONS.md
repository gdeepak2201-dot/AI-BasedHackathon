# SkillSync AI - Setup Instructions

## Prerequisites
1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **npm** or **yarn**

## Quick Start (20 minutes)

### Step 1: Create PostgreSQL Database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE skillsync;
```

Or use this command in psql:
```bash
createdb skillsync
```

### Step 2: Run Database Schema

Open pgAdmin Query Tool and paste the contents of `skillsync_schema.sql` file.

### Step 3: Update Database Password

Edit `backend/.env` and update the `DATABASE_URL` with your PostgreSQL password:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/skillsync
```

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Demo Accounts

After running the seed script, you can login with:

- **Admin**: `admin@skillsync.ai` / `Admin@123`
- **Manager**: `manager@skillsync.ai` / `Manager@123`
- **Employee**: `alice@skillsync.ai` / `Employee@123`

## Optional Services

The app works without these, but they enable AI features:

- **Neo4j**: For team chemistry graph analysis
- **ChromaDB**: For vector embeddings and skill search
- **Redis**: For caching

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`
