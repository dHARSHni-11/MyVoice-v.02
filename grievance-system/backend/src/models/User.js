const { query } = require('./db');

const User = {
  async create({ name, email, passwordHash, role = 'customer', governmentId = null, department = null }) {
    const id = require('crypto').randomUUID();
    await query(
      'INSERT INTO users (id, name, email, password_hash, role, government_id, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, passwordHash, role, governmentId, department]
    );
    return { id, name, email, role, governmentId, department };
  },

  async findByEmail(email) {
    const res = await query('SELECT * FROM users WHERE email = ?', [email]);
    return res.rows[0];
  },

  async findById(id) {
    const res = await query(
      'SELECT id, name, email, role, department, government_id AS governmentId, created_at FROM users WHERE id = ?',
      [id]
    );
    return res.rows[0];
  },

  async findByRole(role) {
    const res = await query(
      'SELECT id, name, email, role FROM users WHERE role = ? ORDER BY name',
      [role]
    );
    return res.rows;
  },

  async findByGovernmentId(governmentId) {
    const res = await query('SELECT * FROM users WHERE government_id = ?', [governmentId]);
    return res.rows[0];
  },
};

module.exports = User;
