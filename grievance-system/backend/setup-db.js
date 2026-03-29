require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function setup() {
  // Step 1: connect without DB to create it
  let conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  console.log('Connected to MySQL');

  await conn.query('CREATE DATABASE IF NOT EXISTS grievance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log('Database grievance_db ready');
  await conn.end();

  // Step 2: connect with DB and run table creation
  conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'grievance_db',
  });

  const schema = fs.readFileSync(
    path.join(__dirname, '../database/schema.sql'), 'utf8'
  );

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.toUpperCase().startsWith('USE') && !s.toUpperCase().startsWith('CREATE DATABASE'));

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
      console.log('OK:', preview);
    } catch (e) {
      if (['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_ENTRY'].includes(e.code)) {
        console.log('SKIP (exists):', stmt.substring(0, 50).replace(/\n/g, ' '));
      } else {
        console.error('ERR:', e.message);
      }
    }
  }

  await conn.end();
  console.log('\nDatabase setup complete!');
  process.exit(0);
}

setup().catch(e => { console.error(e.message); process.exit(1); });
