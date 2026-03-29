const { query } = require('./db');
const crypto = require('crypto');

const Department = {
  async addUpdate({ grievanceId, status, note, updatedBy }) {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO grievance_updates (id, grievance_id, status, note, updated_by) VALUES (?,?,?,?,?)',
      [id, grievanceId, status, note, updatedBy]
    );
    const res = await query('SELECT * FROM grievance_updates WHERE id = ?', [id]);
    return res.rows[0];
  },

  async getUpdates(grievanceId) {
    const res = await query(
      `SELECT gu.*, u.name AS author_name
       FROM grievance_updates gu
       LEFT JOIN users u ON gu.updated_by = u.id
       WHERE gu.grievance_id = ?
       ORDER BY gu.created_at ASC`,
      [grievanceId]
    );
    return res.rows;
  },

  async addNote({ grievanceId, note, authorId }) {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO internal_notes (id, grievance_id, note, author_id) VALUES (?,?,?,?)',
      [id, grievanceId, note, authorId]
    );
    const res = await query('SELECT * FROM internal_notes WHERE id = ?', [id]);
    return res.rows[0];
  },

  async getNotes(grievanceId) {
    const res = await query(
      `SELECT n.*, u.name AS author_name
       FROM internal_notes n
       LEFT JOIN users u ON n.author_id = u.id
       WHERE n.grievance_id = ?
       ORDER BY n.created_at ASC`,
      [grievanceId]
    );
    return res.rows;
  },
};

module.exports = Department;
