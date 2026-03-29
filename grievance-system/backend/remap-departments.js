require('dotenv').config();
const { query } = require('./src/models/db');

function toDept(text) {
  const n = (text || '').toLowerCase();
  if (n.includes('water') || n.includes('pipe') || n.includes('tap') || n.includes('drainage') || n.includes('sewage')) return 'Water';
  if (n.includes('road') || n.includes('pothole') || n.includes('street') || n.includes('footpath') || n.includes('pavement')) return 'Road';
  if (n.includes('electricity') || n.includes('power') || n.includes('light') || n.includes('electric') || n.includes('voltage') || n.includes('outage')) return 'Electricity';
  if (n.includes('garbage') || n.includes('sanitation') || n.includes('trash') || n.includes('waste') || n.includes('dustbin')) return 'Garbage';
  return null;
}

async function fix() {
  const res = await query('SELECT id, ticket_id, subject, description, category FROM grievances WHERE is_deleted = 0');
  console.log('Found', res.rows.length, 'complaints to fix');
  for (const g of res.rows) {
    const dept = toDept(g.category) || toDept(g.subject) || toDept(g.description) || 'General';
    await query('UPDATE grievances SET department = ? WHERE id = ?', [dept, g.id]);
    console.log(g.ticket_id, '|', g.subject, '->', dept);
  }
  console.log('\nDone. All complaints re-mapped.');
  process.exit(0);
}

fix().catch(e => { console.error(e.message); process.exit(1); });
