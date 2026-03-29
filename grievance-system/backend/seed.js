require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./src/models/db');
const crypto = require('crypto');

async function seed() {
  const users = [
    { name: 'Admin User',          email: 'admin@caredesk.in',       password: 'Admin@123',   role: 'admin' },
    { name: 'Support Officer',     email: 'officer@caredesk.in',     password: 'Officer@123', role: 'officer' },
    { name: 'Gov Super Admin',     email: 'govadmin@myvoice.in',     password: 'Gov@1234',    role: 'admin',   governmentId: 'GOV-0001', department: null },
    { name: 'Water Dept Official', email: 'water@gov.in',            password: 'Water@123',   role: 'admin',   governmentId: 'GOV-1001', department: 'Water' },
    { name: 'Road Dept Official',  email: 'road@gov.in',             password: 'Road@123',    role: 'admin',   governmentId: 'GOV-1002', department: 'Road' },
    { name: 'Electricity Official',email: 'electricity@gov.in',      password: 'Elec@123',    role: 'admin',   governmentId: 'GOV-1003', department: 'Electricity' },
    { name: 'Garbage Official',    email: 'garbage@gov.in',          password: 'Garb@123',    role: 'admin',   governmentId: 'GOV-1004', department: 'Garbage' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, government_id, department)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), government_id = VALUES(government_id), department = VALUES(department)`,
      [id, u.name, u.email, hash, u.role, u.governmentId || null, u.department || null]
    );
    console.log(`Seeded: ${u.email} (${u.role}${u.department ? ' / ' + u.department : ''})`);
  }

  console.log('\n=== Government Portal Credentials ===');
  console.log('  Super Admin:   GOV-0001 / govadmin@myvoice.in / Gov@1234');
  console.log('  Water Dept:    GOV-1001 / water@gov.in / Water@123');
  console.log('  Road Dept:     GOV-1002 / road@gov.in / Road@123');
  console.log('  Electricity:   GOV-1003 / electricity@gov.in / Elec@123');
  console.log('  Garbage:       GOV-1004 / garbage@gov.in / Garb@123');
  console.log('\n=== Citizen Portal Credentials ===');
  console.log('  Admin:   admin@caredesk.in / Admin@123');
  console.log('  Officer: officer@caredesk.in / Officer@123');
  process.exit(0);
}

seed().catch((e) => { console.error(e.message); process.exit(1); });
