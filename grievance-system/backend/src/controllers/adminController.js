const { query } = require('../models/db');
const User = require('../models/User');

const getStats = async (req, res, next) => {
  try {
    const deptFilter = req.user?.department ? `AND department = ?` : '';
    const deptParam = req.user?.department ? [req.user.department] : [];
    const [totals, byCategory, byStatus, byDay, byDept] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total,
          SUM(status = 'open') AS \`open\`,
          SUM(status = 'pending') AS pending,
          SUM(status = 'in-progress') AS inProgress,
          SUM(status = 'resolved') AS resolved,
          SUM(status = 'closed') AS closed,
          SUM(priority = 'critical') AS critical,
          ROUND(AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)/3600), 1) AS avgResolutionHours
        FROM grievances WHERE is_deleted = 0 ${deptFilter}
      `, deptParam),
      query(`
        SELECT category, COUNT(*) AS count
        FROM grievances WHERE is_deleted = 0 AND category IS NOT NULL ${deptFilter}
        GROUP BY category ORDER BY count DESC
      `, deptParam),
      query(`
        SELECT status, COUNT(*) AS count
        FROM grievances WHERE is_deleted = 0 ${deptFilter}
        GROUP BY status
      `, deptParam),
      query(`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM grievances WHERE is_deleted = 0 ${deptFilter}
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY day ORDER BY day
      `, deptParam),
      query(`
        SELECT department, COUNT(*) AS count,
          SUM(status = 'open') AS open,
          SUM(status = 'in-progress') AS inProgress,
          SUM(status = 'resolved') AS resolved
        FROM grievances WHERE is_deleted = 0 AND department IS NOT NULL
        GROUP BY department ORDER BY count DESC
      `),
    ]);

    res.json({
      ...totals.rows[0],
      byCategory: byCategory.rows,
      byStatus: byStatus.rows,
      byDay: byDay.rows,
      byDepartment: byDept.rows,
    });
  } catch (err) { next(err); }
};

const getOfficers = async (req, res, next) => {
  try {
    const officers = await User.findByRole('officer');
    res.json({ officers });
  } catch (err) { next(err); }
};

const exportCSV = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ticket_id, customer_name, customer_email, category, priority, status, subject, created_at, updated_at
       FROM grievances WHERE is_deleted = 0 ORDER BY created_at DESC`
    );
    const headers = ['Ticket ID', 'Customer Name', 'Email', 'Category', 'Priority', 'Status', 'Subject', 'Created At', 'Updated At'];
    const rows = result.rows.map(r =>
      [r.ticket_id, r.customer_name, r.customer_email, r.category, r.priority, r.status,
       `"${(r.subject || '').replace(/"/g, '""')}"`, r.created_at, r.updated_at].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="grievances.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};

module.exports = { getStats, getOfficers, exportCSV };
