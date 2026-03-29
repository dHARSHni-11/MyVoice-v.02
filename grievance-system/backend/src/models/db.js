const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// ── Railway MySQL env vars (with fallback to standard DB_* for local dev) ──
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'grievance_db',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  // Railway MySQL uses SSL in production
  ...(process.env.RAILWAY_ENVIRONMENT ? { ssl: { rejectUnauthorized: false } } : {}),
});

// ── Strict startup check — crash if MySQL is unreachable ──
(async () => {
  try {
    const conn = await pool.getConnection();
    logger.info('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    logger.error(`❌ FATAL: MySQL connection failed — ${err.message}`);
    logger.error('The backend cannot operate without a database. Shutting down.');
    process.exit(1);
  }
})();

// ── Query wrapper ──
const query = async (sql, params = []) => {
  // Convert PostgreSQL $1,$2 placeholders to MySQL ? (legacy compat)
  const mysqlSql = sql.replace(/\$\d+/g, '?');
  const safeParams = params.map(p => (p === null || p === undefined) ? null : p);
  const [rows] = await pool.query(mysqlSql, safeParams);
  return { rows: Array.isArray(rows) ? rows : [rows] };
};

module.exports = { query, pool };
