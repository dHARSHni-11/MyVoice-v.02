const { query } = require('./db');
const crypto = require('crypto');

const Grievance = {
  /**
   * Create a new grievance with full engineering-residual fields.
   */
  async create(data) {
    const {
      ticketId, customerName, customerEmail, customerPhone,
      orderId, category, priority, department, subject, description,
      sentiment, attachmentUrl, latitude, longitude, imageHash, priorityScore,
      district, state, country,
    } = data;
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO grievances
        (id, ticket_id, customer_name, customer_email, customer_phone,
         order_id, category, priority, department, subject, description,
         sentiment, attachment_url, latitude, longitude, image_hash, priority_score,
         district, state, country)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, ticketId, customerName, customerEmail, customerPhone,
       orderId, category, priority, department, subject, description,
       sentiment, attachmentUrl,
       latitude || null, longitude || null, imageHash || null, priorityScore || null,
       district || null, state || null, country || null]
    );
    const res = await query('SELECT * FROM grievances WHERE id = ?', [id]);
    return res.rows[0];
  },

  /**
   * List grievances with optional sorting by priority_score ("True Impact").
   */
  async findAll({ status, priority, category, department, assignedTo, customerEmail, search, sortBy, limit = 50, offset = 0 } = {}) {
    let conditions = ['g.is_deleted = 0'];
    const params = [];

    if (status) { conditions.push('g.status = ?'); params.push(status); }
    if (priority) { conditions.push('g.priority = ?'); params.push(priority); }
    if (category) { conditions.push('g.category = ?'); params.push(category); }
    if (department) { conditions.push('g.department = ?'); params.push(department); }
    if (assignedTo) { conditions.push('g.assigned_to = ?'); params.push(assignedTo); }
    if (customerEmail) { conditions.push('g.customer_email = ?'); params.push(customerEmail); }
    if (search) {
      conditions.push('(g.ticket_id LIKE ? OR g.subject LIKE ? OR g.customer_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Support "True Impact" sorting via priority_score
    const orderClause = sortBy === 'priority_score'
      ? 'ORDER BY g.priority_score DESC, g.created_at DESC'
      : 'ORDER BY g.created_at DESC';

    params.push(parseInt(limit), parseInt(offset));

    const res = await query(
      `SELECT g.*, u.name AS assigned_officer_name
       FROM grievances g
       LEFT JOIN users u ON g.assigned_to = u.id
       ${where}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      params
    );
    return res.rows;
  },

  async findByTicketId(ticketId) {
    const res = await query(
      `SELECT g.*, u.name AS assigned_officer_name
       FROM grievances g
       LEFT JOIN users u ON g.assigned_to = u.id
       WHERE g.ticket_id = ? AND g.is_deleted = 0`,
      [ticketId]
    );
    return res.rows[0];
  },

  async findById(id) {
    const res = await query(
      `SELECT g.*, u.name AS assigned_officer_name
       FROM grievances g
       LEFT JOIN users u ON g.assigned_to = u.id
       WHERE g.id = ? AND g.is_deleted = 0`,
      [id]
    );
    return res.rows[0];
  },

  async updateStatus(id, status, aiResponse) {
    if (aiResponse !== undefined) {
      await query('UPDATE grievances SET status = ?, ai_response = ? WHERE id = ?', [status, aiResponse, id]);
    } else {
      await query('UPDATE grievances SET status = ? WHERE id = ?', [status, id]);
    }
    return this.findById(id);
  },

  async assignOfficer(id, officerId) {
    await query('UPDATE grievances SET assigned_to = ? WHERE id = ?', [officerId, id]);
    return this.findById(id);
  },

  async softDelete(id) {
    await query('UPDATE grievances SET is_deleted = 1 WHERE id = ?', [id]);
  },

  async upvote(id) {
    await query('UPDATE grievances SET upvote_count = COALESCE(upvote_count, 0) + 1 WHERE id = ?', [id]);
  },

  /**
   * Update the priority_score for an existing grievance (e.g. on SLA cron recalc).
   */
  async updatePriorityScore(id, score) {
    await query('UPDATE grievances SET priority_score = ? WHERE id = ?', [score, id]);
  },

  async findOverdueSLA() {
    const res = await query(
      `SELECT * FROM grievances
       WHERE is_deleted = 0 AND status NOT IN ('resolved','closed')
       AND (
         (priority = 'critical' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)) OR
         (priority = 'high'     AND created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)) OR
         (priority = 'medium'   AND created_at < DATE_SUB(NOW(), INTERVAL 72 HOUR)) OR
         (priority = 'low'      AND created_at < DATE_SUB(NOW(), INTERVAL 120 HOUR))
       )`
    );
    return res.rows;
  },
};

module.exports = Grievance;
