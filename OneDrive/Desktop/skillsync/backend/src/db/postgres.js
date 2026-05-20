const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectPostgres = async () => {
  const config = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'skillsync',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: false
      };

  pool = new Pool({
    ...config,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  // Test connection
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();

  return pool;
};

const getPool = () => {
  if (!pool) throw new Error('Database not initialized. Call connectPostgres first.');
  return pool;
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return res;
  } catch (error) {
    logger.error('DB query error:', { message: error.message, query: text.substring(0, 100) });
    throw error;
  }
};

const getClient = async () => {
  return await getPool().connect();
};

const withTransaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { connectPostgres, getPool, query, getClient, withTransaction };
