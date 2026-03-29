const mysql = require('mysql2/promise');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'grievance_db',
  waitForConnections: true,
  connectionLimit: 10,
});

let dbAvailable = true;

const nowIso = () => new Date().toISOString();
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const toNum = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;

const devUsers = [
  {
    id: 'u-admin-001',
    name: 'Gov Super Admin',
    email: 'govadmin@myvoice.in',
    password_hash: bcrypt.hashSync('Gov@1234', 10),
    role: 'admin',
    government_id: 'GOV-0001',
    department: null,
    created_at: nowIso(),
  },
  {
    id: 'u-water-001',
    name: 'Water Dept Official',
    email: 'water@gov.in',
    password_hash: bcrypt.hashSync('Water@123', 10),
    role: 'admin',
    government_id: 'GOV-1001',
    department: 'Water',
    created_at: nowIso(),
  },
  {
    id: 'u-road-001',
    name: 'Road Dept Official',
    email: 'road@gov.in',
    password_hash: bcrypt.hashSync('Road@123', 10),
    role: 'admin',
    government_id: 'GOV-1002',
    department: 'Road',
    created_at: nowIso(),
  },
  {
    id: 'u-elec-001',
    name: 'Electricity Official',
    email: 'electricity@gov.in',
    password_hash: bcrypt.hashSync('Elec@123', 10),
    role: 'admin',
    government_id: 'GOV-1003',
    department: 'Electricity',
    created_at: nowIso(),
  },
  {
    id: 'u-garbage-001',
    name: 'Garbage Official',
    email: 'garbage@gov.in',
    password_hash: bcrypt.hashSync('Garb@123', 10),
    role: 'admin',
    government_id: 'GOV-1004',
    department: 'Garbage',
    created_at: nowIso(),
  },
  {
    id: 'u-officer-001',
    name: 'Support Officer',
    email: 'officer@caredesk.in',
    password_hash: bcrypt.hashSync('Officer@123', 10),
    role: 'officer',
    government_id: null,
    department: null,
    created_at: nowIso(),
  },
  {
    id: 'u-admin-caredesk',
    name: 'Admin User',
    email: 'admin@caredesk.in',
    password_hash: bcrypt.hashSync('Admin@123', 10),
    role: 'admin',
    government_id: null,
    department: null,
    created_at: nowIso(),
  },
  {
    id: 'u-citizen-001',
    name: 'Demo Citizen',
    email: 'citizen@myvoice.in',
    password_hash: bcrypt.hashSync('Citizen@123', 10),
    role: 'customer',
    government_id: null,
    department: null,
    created_at: nowIso(),
  },
];

const devGrievances = [
  {
    id: 'g-001', ticket_id: 'MV-10001', customer_name: 'Demo Citizen', customer_email: 'citizen@myvoice.in',
    customer_phone: '9999999999', order_id: null, category: 'Road', priority: 'high', department: 'Road',
    subject: 'Large pothole near bus stand', description: 'Dangerous pothole causing traffic risk near Gandhipuram bus stand, Coimbatore.',
    status: 'open', assigned_to: 'u-officer-001', sentiment: 'urgent', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 3,
    latitude: 11.0168, longitude: 76.9558, image_hash: null, priority_score: 82,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-002', ticket_id: 'MV-10002', customer_name: 'Demo Citizen', customer_email: 'citizen@myvoice.in',
    customer_phone: '9999999999', order_id: null, category: 'Water', priority: 'medium', department: 'Water',
    subject: 'Pipeline leakage in Vellalore', description: 'Continuous water leak from municipal pipeline near Vellalore dump yard, Coimbatore.',
    status: 'in-progress', assigned_to: 'u-officer-001', sentiment: 'frustrated', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 1,
    latitude: 10.9637, longitude: 76.9375, image_hash: null, priority_score: 61,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-003', ticket_id: 'MV-10003', customer_name: 'Priya Kumar', customer_email: 'priya@myvoice.in',
    customer_phone: '9876543210', order_id: null, category: 'Electricity', priority: 'critical', department: 'Electricity',
    subject: 'Transformer explosion in RS Puram', description: 'Transformer caught fire in RS Puram, Coimbatore. No power for 48 hours. Elderly at risk.',
    status: 'open', assigned_to: null, sentiment: 'negative', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 22,
    latitude: 11.0070, longitude: 76.9500, image_hash: null, priority_score: 95,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-004', ticket_id: 'MV-10004', customer_name: 'Rajesh Sharma', customer_email: 'rajesh@myvoice.in',
    customer_phone: '9123456789', order_id: null, category: 'Sanitation', priority: 'high', department: 'Garbage',
    subject: 'Garbage dump overflowing at Gandhipuram', description: 'Massive garbage pile at Gandhipuram market area. Stench affecting shops and pedestrians.',
    status: 'open', assigned_to: 'u-officer-001', sentiment: 'negative', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 15,
    latitude: 11.0180, longitude: 76.9670, image_hash: null, priority_score: 78,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-005', ticket_id: 'MV-10005', customer_name: 'Lakshmi Devi', customer_email: 'lakshmi@myvoice.in',
    customer_phone: '9988776655', order_id: null, category: 'Road', priority: 'medium', department: 'Road',
    subject: 'Broken road near Saibaba Colony', description: 'Road surface completely broken near Saibaba Colony junction. Accident risk.',
    status: 'open', assigned_to: 'u-officer-001', sentiment: 'neutral', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 4,
    latitude: 11.0245, longitude: 76.9430, image_hash: null, priority_score: 55,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-006', ticket_id: 'MV-10006', customer_name: 'Karthik Raja', customer_email: 'karthik@myvoice.in',
    customer_phone: '9112233445', order_id: null, category: 'Water', priority: 'critical', department: 'Water',
    subject: 'No water supply for 5 days in Peelamedu', description: 'Complete water supply shutdown in Peelamedu area. Hospital and schools affected.',
    status: 'open', assigned_to: null, sentiment: 'negative', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 30,
    latitude: 11.0310, longitude: 77.0015, image_hash: null, priority_score: 92,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-007', ticket_id: 'MV-10007', customer_name: 'Anjali Menon', customer_email: 'anjali@myvoice.in',
    customer_phone: '9556677889', order_id: null, category: 'Electricity', priority: 'low', department: 'Electricity',
    subject: 'Streetlight not working in Singanallur', description: 'Streetlight near Singanallur bus stop not functioning for a week.',
    status: 'in-progress', assigned_to: 'u-officer-001', sentiment: 'neutral', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 2,
    latitude: 10.9950, longitude: 76.9720, image_hash: null, priority_score: 30,
    district: 'Coimbatore', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-008', ticket_id: 'MV-10008', customer_name: 'Suresh Babu', customer_email: 'suresh@myvoice.in',
    customer_phone: '9443221100', order_id: null, category: 'Road', priority: 'high', department: 'Road',
    subject: 'Pothole on Anna Salai near T. Nagar', description: 'Deep pothole on Anna Salai causing accidents. Multiple vehicles damaged.',
    status: 'open', assigned_to: 'u-officer-001', sentiment: 'negative', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 8,
    latitude: 13.0418, longitude: 80.2341, image_hash: null, priority_score: 76,
    district: 'Chennai', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-009', ticket_id: 'MV-10009', customer_name: 'Divya Krishnan', customer_email: 'divya@myvoice.in',
    customer_phone: '9887766554', order_id: null, category: 'Sanitation', priority: 'medium', department: 'Garbage',
    subject: 'Open drain overflowing in Adyar', description: 'Storm water drain overflowing near Adyar bridge. Sewage water on roads.',
    status: 'open', assigned_to: null, sentiment: 'frustrated', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 6,
    latitude: 13.0067, longitude: 80.2573, image_hash: null, priority_score: 64,
    district: 'Chennai', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'g-010', ticket_id: 'MV-10010', customer_name: 'Venkat Raman', customer_email: 'venkat@myvoice.in',
    customer_phone: '9001122334', order_id: null, category: 'Road', priority: 'low', department: 'Road',
    subject: 'Speed breaker request near school in Tambaram', description: 'Need speed breaker installation near Tambaram Government Higher Secondary School.',
    status: 'resolved', assigned_to: 'u-officer-001', sentiment: 'neutral', ai_response: null, attachment_url: null,
    user_id: 'u-citizen-001', is_deleted: 0, upvote_count: 1,
    latitude: 12.9249, longitude: 80.1000, image_hash: null, priority_score: 25,
    district: 'Chengalpattu', state: 'Tamil Nadu', country: 'India', created_at: nowIso(), updated_at: nowIso(),
  },
];

const devUpdates = [
  {
    id: 'gu-001',
    grievance_id: 'g-001',
    status: 'open',
    note: 'Grievance submitted',
    updated_by: null,
    created_at: nowIso(),
  },
];

const devNotes = [];

function withOfficerName(g) {
  const officer = devUsers.find((u) => u.id === g.assigned_to);
  return { ...g, assigned_officer_name: officer ? officer.name : null };
}

function filterGrievancesFromSelect(sql, params) {
  let rows = devGrievances.filter((g) => g.is_deleted === 0);
  let i = 0;
  const s = sql.toLowerCase();

  if (s.includes('g.status = ?')) rows = rows.filter((g) => g.status === params[i++]);
  if (s.includes('g.priority = ?')) rows = rows.filter((g) => g.priority === params[i++]);
  if (s.includes('g.category = ?')) rows = rows.filter((g) => g.category === params[i++]);
  if (s.includes('g.department = ?')) rows = rows.filter((g) => g.department === params[i++]);
  if (s.includes('g.assigned_to = ?')) rows = rows.filter((g) => g.assigned_to === params[i++]);
  if (s.includes('g.customer_email = ?')) rows = rows.filter((g) => g.customer_email === params[i++]);
  if (s.includes('g.ticket_id like ? or g.subject like ? or g.customer_name like ?')) {
    const q = String(params[i++] || '').replace(/%/g, '').toLowerCase();
    i += 2;
    rows = rows.filter((g) =>
      String(g.ticket_id || '').toLowerCase().includes(q) ||
      String(g.subject || '').toLowerCase().includes(q) ||
      String(g.customer_name || '').toLowerCase().includes(q)
    );
  }

  if (s.includes('where g.ticket_id = ?')) {
    const ticketId = params[0];
    rows = rows.filter((g) => g.ticket_id === ticketId);
    return rows.map(withOfficerName);
  }

  if (s.includes('where g.id = ?')) {
    const id = params[0];
    rows = rows.filter((g) => g.id === id);
    return rows.map(withOfficerName);
  }

  if (s.includes('order by g.priority_score desc')) {
    rows.sort((a, b) => (toNum(b.priority_score) - toNum(a.priority_score)) || String(b.created_at).localeCompare(String(a.created_at)));
  } else if (s.includes('order by g.created_at desc')) {
    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  if (s.includes('limit ? offset ?')) {
    const limit = toNum(params[params.length - 2], 50);
    const offset = toNum(params[params.length - 1], 0);
    rows = rows.slice(offset, offset + limit);
  }

  return rows.map(withOfficerName);
}

function statsTotals(department) {
  const rows = devGrievances.filter((g) => g.is_deleted === 0 && (!department || g.department === department));
  const total = rows.length;
  const avgResolutionHours = total
    ? Math.round((rows.reduce((acc, r) => {
      const h = (new Date(r.updated_at) - new Date(r.created_at)) / (1000 * 60 * 60);
      return acc + (Number.isFinite(h) ? h : 0);
    }, 0) / total) * 10) / 10
    : 0;
  return {
    total,
    open: rows.filter((r) => r.status === 'open').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    inProgress: rows.filter((r) => r.status === 'in-progress').length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
    closed: rows.filter((r) => r.status === 'closed').length,
    critical: rows.filter((r) => r.priority === 'critical').length,
    avgResolutionHours,
  };
}

function runOfflineQuery(sql, params = []) {
  const s = sql.toLowerCase().replace(/\s+/g, ' ').trim();

  if (s.includes('select * from users where email = ?')) {
    const row = devUsers.find((u) => u.email === params[0]);
    return { rows: row ? [clone(row)] : [] };
  }

  if (s.includes('select * from users where government_id = ?')) {
    const row = devUsers.find((u) => u.government_id === params[0]);
    return { rows: row ? [clone(row)] : [] };
  }

  if (s.includes('select id, name, email, role, department, government_id as governmentid, created_at from users where id = ?')) {
    const row = devUsers.find((u) => u.id === params[0]);
    if (!row) return { rows: [] };
    return {
      rows: [{
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        governmentId: row.government_id,
        created_at: row.created_at,
      }],
    };
  }

  if (s.includes('select id, name, email, role from users where role = ? order by name')) {
    return { rows: devUsers.filter((u) => u.role === params[0]).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })) };
  }

  if (s.startsWith('insert into users')) {
    const user = {
      id: params[0],
      name: params[1],
      email: params[2],
      password_hash: params[3],
      role: params[4] || 'customer',
      government_id: params[5] || null,
      department: params[6] || null,
      created_at: nowIso(),
    };
    devUsers.push(user);
    return { rows: [{ affectedRows: 1 }] };
  }

  if (s.startsWith('insert into grievances')) {
    const grievance = {
      id: params[0],
      ticket_id: params[1],
      customer_name: params[2],
      customer_email: params[3],
      customer_phone: params[4],
      order_id: params[5],
      category: params[6],
      priority: params[7] || 'medium',
      department: params[8] || 'General',
      subject: params[9],
      description: params[10],
      sentiment: params[11] || 'neutral',
      attachment_url: params[12] || null,
      latitude: params[13] ?? null,
      longitude: params[14] ?? null,
      image_hash: params[15] ?? null,
      priority_score: params[16] ?? null,
      district: params[17] ?? null,
      state: params[18] ?? null,
      country: params[19] ?? null,
      status: 'open',
      assigned_to: null,
      ai_response: null,
      user_id: null,
      is_deleted: 0,
      upvote_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    devGrievances.push(grievance);
    return { rows: [{ affectedRows: 1 }] };
  }

  if (s.includes('from grievances g left join users u on g.assigned_to = u.id')) {
    return { rows: filterGrievancesFromSelect(s, params).map(clone) };
  }

  if (s.startsWith('select * from grievances where id = ?')) {
    const row = devGrievances.find((g) => g.id === params[0]);
    return { rows: row ? [clone(row)] : [] };
  }

  if (s.includes('select * from grievances where is_deleted = 0 and status not in')) {
    const rows = devGrievances.filter((g) => g.is_deleted === 0 && !['resolved', 'closed'].includes(g.status));
    return { rows: clone(rows) };
  }

  if (s.startsWith('update grievances set status = ?, ai_response = ? where id = ?')) {
    const g = devGrievances.find((r) => r.id === params[2]);
    if (g) {
      g.status = params[0];
      g.ai_response = params[1];
      g.updated_at = nowIso();
    }
    return { rows: [{ affectedRows: g ? 1 : 0 }] };
  }

  if (s.startsWith('update grievances set status = ? where id = ?')) {
    const g = devGrievances.find((r) => r.id === params[1]);
    if (g) {
      g.status = params[0];
      g.updated_at = nowIso();
    }
    return { rows: [{ affectedRows: g ? 1 : 0 }] };
  }

  if (s.startsWith('update grievances set assigned_to = ? where id = ?')) {
    const g = devGrievances.find((r) => r.id === params[1]);
    if (g) {
      g.assigned_to = params[0];
      g.updated_at = nowIso();
    }
    return { rows: [{ affectedRows: g ? 1 : 0 }] };
  }

  if (s.startsWith('update grievances set is_deleted = 1 where id = ?')) {
    const g = devGrievances.find((r) => r.id === params[0]);
    if (g) g.is_deleted = 1;
    return { rows: [{ affectedRows: g ? 1 : 0 }] };
  }

  if (s.startsWith('update grievances set upvote_count = coalesce(upvote_count, 0) + 1 where id = ?') ||
      s.startsWith('update grievances set upvote_count = upvote_count + 1 where id = ?')) {
    const g = devGrievances.find((r) => r.id === params[0]);
    if (g) g.upvote_count = toNum(g.upvote_count) + 1;
    return { rows: [{ affectedRows: g ? 1 : 0 }] };
  }

  if (s.startsWith('update grievances set priority_score = ? where id = ?')) {
    const g = devGrievances.find((r) => r.id === params[1]);
    if (g) g.priority_score = params[0];
    return { rows: [{ affectedRows: g ? 1 : 0 }] };
  }

  if (s.startsWith('insert into grievance_updates')) {
    const row = {
      id: params[0],
      grievance_id: params[1],
      status: params[2],
      note: params[3],
      updated_by: params[4] || null,
      created_at: nowIso(),
    };
    devUpdates.push(row);
    return { rows: [{ affectedRows: 1 }] };
  }

  if (s.startsWith('select * from grievance_updates where id = ?')) {
    const row = devUpdates.find((u) => u.id === params[0]);
    return { rows: row ? [clone(row)] : [] };
  }

  if (s.includes('from grievance_updates gu left join users u on gu.updated_by = u.id')) {
    const grievanceId = params[0];
    const rows = devUpdates
      .filter((u) => u.grievance_id === grievanceId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((u) => {
        const author = devUsers.find((x) => x.id === u.updated_by);
        return { ...u, author_name: author ? author.name : null };
      });
    return { rows: clone(rows) };
  }

  if (s.startsWith('insert into internal_notes')) {
    const row = {
      id: params[0],
      grievance_id: params[1],
      note: params[2],
      author_id: params[3] || null,
      created_at: nowIso(),
    };
    devNotes.push(row);
    return { rows: [{ affectedRows: 1 }] };
  }

  if (s.startsWith('select * from internal_notes where id = ?')) {
    const row = devNotes.find((n) => n.id === params[0]);
    return { rows: row ? [clone(row)] : [] };
  }

  if (s.includes('from internal_notes n left join users u on n.author_id = u.id')) {
    const grievanceId = params[0];
    const rows = devNotes
      .filter((n) => n.grievance_id === grievanceId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((n) => {
        const author = devUsers.find((x) => x.id === n.author_id);
        return { ...n, author_name: author ? author.name : null };
      });
    return { rows: clone(rows) };
  }

  if (s.includes('select count(*) as total') && s.includes('from grievances where is_deleted = 0')) {
    const hasDept = s.includes('and department = ?');
    return { rows: [statsTotals(hasDept ? params[0] : null)] };
  }

  if (s.includes('select category, count(*) as count from grievances')) {
    const hasDept = s.includes('and department = ?');
    const dept = hasDept ? params[0] : null;
    const rows = devGrievances
      .filter((g) => g.is_deleted === 0 && g.category && (!dept || g.department === dept))
      .reduce((acc, g) => {
        acc[g.category] = (acc[g.category] || 0) + 1;
        return acc;
      }, {});
    return { rows: Object.entries(rows).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count) };
  }

  if (s.includes('select status, count(*) as count from grievances')) {
    const hasDept = s.includes('and department = ?');
    const dept = hasDept ? params[0] : null;
    const rows = devGrievances
      .filter((g) => g.is_deleted === 0 && (!dept || g.department === dept))
      .reduce((acc, g) => {
        acc[g.status] = (acc[g.status] || 0) + 1;
        return acc;
      }, {});
    return { rows: Object.entries(rows).map(([status, count]) => ({ status, count })) };
  }

  if (s.includes('select date(created_at) as day, count(*) as count from grievances')) {
    const hasDept = s.includes('and department = ?');
    const dept = hasDept ? params[0] : null;
    const rows = devGrievances
      .filter((g) => g.is_deleted === 0 && (!dept || g.department === dept))
      .reduce((acc, g) => {
        const day = String(g.created_at).slice(0, 10);
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});
    return { rows: Object.entries(rows).map(([day, count]) => ({ day, count })).sort((a, b) => String(a.day).localeCompare(String(b.day))) };
  }

  if (s.includes('select department, count(*) as count') && s.includes('from grievances where is_deleted = 0')) {
    const grouped = devGrievances
      .filter((g) => g.is_deleted === 0 && g.department)
      .reduce((acc, g) => {
        if (!acc[g.department]) acc[g.department] = { department: g.department, count: 0, open: 0, inProgress: 0, resolved: 0 };
        acc[g.department].count += 1;
        if (g.status === 'open') acc[g.department].open += 1;
        if (g.status === 'in-progress') acc[g.department].inProgress += 1;
        if (g.status === 'resolved') acc[g.department].resolved += 1;
        return acc;
      }, {});
    return { rows: Object.values(grouped).sort((a, b) => b.count - a.count) };
  }

  if (s.includes('select ticket_id, customer_name, customer_email, category, priority, status, subject, created_at, updated_at from grievances')) {
    const rows = devGrievances
      .filter((g) => g.is_deleted === 0)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((g) => ({
        ticket_id: g.ticket_id,
        customer_name: g.customer_name,
        customer_email: g.customer_email,
        category: g.category,
        priority: g.priority,
        status: g.status,
        subject: g.subject,
        created_at: g.created_at,
        updated_at: g.updated_at,
      }));
    return { rows };
  }

  if (s.startsWith('insert into grievance_upvoters')) {
    return { rows: [{ affectedRows: 1 }] };
  }

  if (s.includes('from grievances where is_deleted = 0 and status in (')) {
    return { rows: [] };
  }

  logger.warn(`Offline DB fallback hit unhandled SQL: ${sql.substring(0, 120)}`);
  return { rows: [] };
}

pool.getConnection()
  .then((conn) => { logger.info('MySQL connected'); conn.release(); })
  .catch((err) => {
    dbAvailable = false;
    logger.error('MySQL connection error: ' + err.message);
    logger.warn('Running in offline DB fallback mode for development testing.');
  });

// Wrapper that returns rows directly (mimics pg behaviour)
const query = async (sql, params = []) => {
  if (!dbAvailable) return runOfflineQuery(sql, params);

  // Convert PostgreSQL $1,$2 placeholders to MySQL ?
  const mysqlSql = sql.replace(/\$\d+/g, '?');
  // Ensure all params are MySQL-safe types (stringify numbers for prepared stmts)
  const safeParams = params.map(p => (p === null || p === undefined) ? null : p);
  try {
    const [rows] = await pool.query(mysqlSql, safeParams);
    return { rows: Array.isArray(rows) ? rows : [rows] };
  } catch (err) {
    if (['ER_ACCESS_DENIED_ERROR', 'ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST'].includes(err.code)) {
      dbAvailable = false;
      logger.warn(`MySQL unavailable (${err.code}). Switching to offline DB fallback mode.`);
      return runOfflineQuery(sql, params);
    }
    throw err;
  }
};

module.exports = { query, pool };
