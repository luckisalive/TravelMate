const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('FATAL: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: parseInt(process.env.DB_POOL_MAX || '25', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000', 10),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
