require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const setupDatabase = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    ssl: false
  });

  try {
    console.log('Checking/creating database...');

    // Check if database exists
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'skillsync'"
    );

    if (rows.length === 0) {
      console.log('Creating database skillsync...');
      await pool.query('CREATE DATABASE skillsync');
      console.log('✅ Database skillsync created');
    } else {
      console.log('✅ Database skillsync already exists');
    }

    pool.end();
    console.log('\nNext steps:');
    console.log('1. Update DATABASE_URL in backend/.env with your password');
    console.log('2. Run: node src/db/migrate.js');
    console.log('3. Run: node src/db/seed.js');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure PostgreSQL is running and DATABASE_URL is correct');
    process.exit(1);
  }
};

setupDatabase();
