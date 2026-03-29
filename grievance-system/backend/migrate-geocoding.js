/**
 * Migration: Add geocoding columns (district, state, country) to grievances table.
 * Run: node migrate-geocoding.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'grievance_db',
  });

  console.log('Connected to database. Running geocoding migration...');

  const columns = [
    { name: 'district', type: 'VARCHAR(100) DEFAULT NULL', after: 'image_hash' },
    { name: 'state', type: 'VARCHAR(100) DEFAULT NULL', after: 'district' },
    { name: 'country', type: 'VARCHAR(100) DEFAULT NULL', after: 'state' },
  ];

  for (const col of columns) {
    try {
      const [rows] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'grievances' AND COLUMN_NAME = ?`,
        [process.env.DB_NAME || 'grievance_db', col.name]
      );
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE grievances ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`);
        console.log(`  ✅ Added column: ${col.name}`);
      } else {
        console.log(`  ⏭️  Column already exists: ${col.name}`);
      }
    } catch (err) {
      console.error(`  ❌ Error adding ${col.name}:`, err.message);
    }
  }

  // Add indexes
  const indexes = [
    { name: 'idx_district', column: 'district' },
    { name: 'idx_state', column: 'state' },
  ];

  for (const idx of indexes) {
    try {
      const [rows] = await conn.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'grievances' AND INDEX_NAME = ?`,
        [process.env.DB_NAME || 'grievance_db', idx.name]
      );
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE grievances ADD INDEX ${idx.name} (${idx.column})`);
        console.log(`  ✅ Added index: ${idx.name}`);
      } else {
        console.log(`  ⏭️  Index already exists: ${idx.name}`);
      }
    } catch (err) {
      console.error(`  ❌ Error adding index ${idx.name}:`, err.message);
    }
  }

  console.log('Migration complete.');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
