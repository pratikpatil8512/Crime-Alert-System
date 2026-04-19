// const {Pool} = require('pg');
// require ('dotenv').config();

// const pool = new Pool({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     database: process.env.DB_NAME,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     max: process.env.DB_POOL_MAX || 10,
//     ssl: process.env.DB_SSLMODE === 'disable' ? false : { rejectUnauthorized: false }
// });

// module.exports = pool;

const pkg = require('pg');
require ('dotenv').config();
// dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_UR,
  ssl: false, // important for Supabase
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to Supabase DB at', res.rows[0].now);
  }
});

module.exports = pool;
