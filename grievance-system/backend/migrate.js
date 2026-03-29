require('dotenv').config();
const { query } = require('./src/models/db');

async function columnExists(table, column) {
  const res = await query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return res.rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`⏭️  ${table}.${column} already exists`);
  } else {
    await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Added ${table}.${column}`);
  }
}

async function migrate() {
  await addColumnIfMissing('grievances', 'department',   "VARCHAR(50) DEFAULT 'General'");
  await addColumnIfMissing('grievances', 'upvotes',      'INT DEFAULT 0');
  await addColumnIfMissing('grievances', 'sentiment',    "VARCHAR(20) DEFAULT 'neutral'");
  await addColumnIfMissing('grievances', 'ai_response',  'TEXT');

  // Backfill nulls
  await query(`UPDATE grievances SET department = 'General' WHERE department IS NULL OR department = ''`);
  console.log('✅ Backfilled department nulls');

  console.log('\nMigration complete. Restart the backend server.');
  process.exit(0);
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
