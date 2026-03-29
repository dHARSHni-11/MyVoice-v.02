require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: 'grievance_db',
    multipleStatements: true,
  });

  console.log('Connected to grievance_db');

  const migrationFiles = [
    '../database/migration_engineering_residuals.sql',
    '../database/migration_geocoding_triage.sql',
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    console.log(`\nRunning: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.toUpperCase().startsWith('USE'));

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        console.log('  OK:', stmt.substring(0, 70).replace(/\n/g, ' '));
      } catch (e) {
        if (['ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME', 'ER_TABLE_EXISTS_ERROR', 'ER_DUP_ENTRY'].includes(e.code)) {
          console.log('  SKIP (exists):', stmt.substring(0, 50).replace(/\n/g, ' '));
        } else {
          console.error('  ERR:', e.message);
        }
      }
    }
  }

  // Verify the table structure
  const [cols] = await conn.query('SHOW COLUMNS FROM grievances');
  console.log('\n=== grievances table columns ===');
  cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${c.Default !== null ? 'DEFAULT=' + c.Default : ''}`));

  await conn.end();
  console.log('\nAll migrations complete!');
  process.exit(0);
}

runMigrations().catch(e => { console.error(e.message); process.exit(1); });
