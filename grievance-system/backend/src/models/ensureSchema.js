const logger = require('../utils/logger');
const { pool } = require('./db');

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function addColumnIfMissing(tableName, columnName, definitionSql) {
  if (await columnExists(tableName, columnName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
  logger.info(`Schema: added ${tableName}.${columnName}`);
}

async function addIndexIfMissing(tableName, indexName, colsSql) {
  if (await indexExists(tableName, indexName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${colsSql})`);
  logger.info(`Schema: added index ${tableName}.${indexName}`);
}

async function ensureCoreTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) DEFAULT 'customer',
      government_id VARCHAR(50) UNIQUE,
      department VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grievances (
      id VARCHAR(36) PRIMARY KEY,
      ticket_id VARCHAR(20) UNIQUE NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      customer_email VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(20),
      order_id VARCHAR(50),
      category VARCHAR(50),
      priority VARCHAR(20) DEFAULT 'medium',
      department VARCHAR(50),
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'open',
      assigned_to VARCHAR(36),
      sentiment VARCHAR(20),
      ai_response TEXT,
      attachment_url TEXT,
      user_id VARCHAR(36),
      is_deleted TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grievance_updates (
      id VARCHAR(36) PRIMARY KEY,
      grievance_id VARCHAR(36),
      status VARCHAR(30),
      note TEXT,
      updated_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS internal_notes (
      id VARCHAR(36) PRIMARY KEY,
      grievance_id VARCHAR(36),
      note TEXT NOT NULL,
      author_id VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS grievance_upvoters (
      id VARCHAR(36) PRIMARY KEY,
      grievance_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_grievance_user (grievance_id, user_id)
    )
  `);
}

async function ensureGrievanceColumns() {
  await addColumnIfMissing('grievances', 'latitude', 'DECIMAL(10,8) DEFAULT NULL');
  await addColumnIfMissing('grievances', 'longitude', 'DECIMAL(11,8) DEFAULT NULL');
  await addColumnIfMissing('grievances', 'image_hash', 'VARCHAR(64) DEFAULT NULL');
  await addColumnIfMissing('grievances', 'upvote_count', 'INT DEFAULT 0');
  await addColumnIfMissing('grievances', 'priority_score', 'DECIMAL(5,2) DEFAULT NULL');
  await addColumnIfMissing('grievances', 'district', 'VARCHAR(100) DEFAULT NULL');
  await addColumnIfMissing('grievances', 'state', 'VARCHAR(100) DEFAULT NULL');
  await addColumnIfMissing('grievances', 'country', 'VARCHAR(100) DEFAULT NULL');

  await addIndexIfMissing('grievances', 'idx_geo', 'latitude, longitude');
  await addIndexIfMissing('grievances', 'idx_priority_score', 'priority_score');
  await addIndexIfMissing('grievances', 'idx_district', 'district');
  await addIndexIfMissing('grievances', 'idx_state', 'state');
}

async function ensureDefaultUsers() {
  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');

  const users = [
    { name: 'Admin User',           email: 'admin@caredesk.in',    password: 'Admin@123',   role: 'admin',   governmentId: null,       department: null },
    { name: 'Support Officer',      email: 'officer@caredesk.in',  password: 'Officer@123', role: 'officer', governmentId: null,       department: null },
    { name: 'Gov Super Admin',      email: 'govadmin@myvoice.in',  password: 'Gov@1234',    role: 'admin',   governmentId: 'GOV-0001', department: null },
    { name: 'Water Dept Official',  email: 'water@gov.in',         password: 'Water@123',   role: 'admin',   governmentId: 'GOV-1001', department: 'Water' },
    { name: 'Road Dept Official',   email: 'road@gov.in',          password: 'Road@123',    role: 'admin',   governmentId: 'GOV-1002', department: 'Road' },
    { name: 'Electricity Official', email: 'electricity@gov.in',   password: 'Elec@123',    role: 'admin',   governmentId: 'GOV-1003', department: 'Electricity' },
    { name: 'Garbage Official',     email: 'garbage@gov.in',       password: 'Garb@123',    role: 'admin',   governmentId: 'GOV-1004', department: 'Garbage' },
  ];

  for (const u of users) {
    // Check if user already exists by email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing.length > 0) continue;

    const hash = await bcrypt.hash(u.password, 12);
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, government_id, department)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, u.name, u.email, hash, u.role, u.governmentId, u.department]
    );
    logger.info(`Schema: seeded user ${u.email} (${u.role}${u.department ? ' / ' + u.department : ''})`);
  }
}

async function cleanupTestGrievances() {
  // One-time cleanup: remove test grievances created during development/debugging
  const testTickets = [
    'GRV-MNBXADMG-R2TO',
    'GRV-MNBX8OTD-HQ44',
    'GRV-MNBWDGJY-PVIN',
    'GRV-MNBW6E3H-JCDM',
    'GRV-MNBRD8SS-NM47',
  ];

  for (const ticketId of testTickets) {
    // Get grievance id first
    const [rows] = await pool.query('SELECT id FROM grievances WHERE ticket_id = ?', [ticketId]);
    if (rows.length === 0) continue;

    const gId = rows[0].id;
    // Delete related records first (foreign key constraints)
    await pool.query('DELETE FROM internal_notes WHERE grievance_id = ?', [gId]);
    await pool.query('DELETE FROM grievance_updates WHERE grievance_id = ?', [gId]);
    await pool.query('DELETE FROM grievance_upvoters WHERE grievance_id = ?', [gId]);
    // Hard delete the grievance
    await pool.query('DELETE FROM grievances WHERE id = ?', [gId]);
    logger.info(`Cleanup: deleted test grievance ${ticketId}`);
  }
}

async function ensureSchema() {
  const hasUsers = await tableExists('users');
  const hasGrievances = await tableExists('grievances');
  if (!hasUsers || !hasGrievances) {
    logger.warn('Schema: core tables missing, creating required schema');
  }

  await ensureCoreTables();
  await ensureGrievanceColumns();
  await ensureDefaultUsers();
  await cleanupTestGrievances();
  logger.info('Schema: verification complete');
}

module.exports = { ensureSchema };
