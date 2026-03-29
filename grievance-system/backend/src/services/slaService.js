const SLA_HOURS = { critical: 24, high: 48, medium: 72, low: 120 };

function checkSLA(grievance) {
  const limit = SLA_HOURS[grievance.priority] || 72;
  const created = new Date(grievance.created_at);
  const now = new Date();
  const elapsedHours = (now - created) / (1000 * 60 * 60);
  const hoursRemaining = limit - elapsedHours;
  return { breached: hoursRemaining <= 0, hoursRemaining: Math.max(0, hoursRemaining) };
}

let io;
const cron = require('node-cron');
const Grievance = require('../models/Grievance');
const logger = require('../utils/logger');

function startSLACron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const overdue = await Grievance.findOverdueSLA();
      logger.info(`SLA check: ${overdue.length} overdue tickets`);
      for (const g of overdue) {
        if (g.priority !== 'critical') {
          await Grievance.updateStatus(g.id, 'critical');
          logger.warn(`Escalated ticket ${g.ticket_id} to critical`);
        }
      }
    } catch (err) {
      logger.error('SLA cron error:', err.message);
    }
  });
  logger.info('SLA cron job started');
}

module.exports = { checkSLA, startSLACron };
