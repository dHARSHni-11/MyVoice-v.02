const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({ from: `"CareDesk" <${process.env.EMAIL_USER}>`, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
  }
};

const sendAcknowledgement = (grievance) =>
  sendMail(
    grievance.customer_email,
    `Grievance Received — ${grievance.ticket_id}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#0f172a">We've received your grievance</h2>
      <p>Dear ${grievance.customer_name},</p>
      <p>Your grievance has been registered successfully.</p>
      <p><strong>Ticket ID:</strong> <code>${grievance.ticket_id}</code></p>
      <p><strong>Subject:</strong> ${grievance.subject}</p>
      <p><strong>Priority:</strong> ${grievance.priority}</p>
      <p>Our team will review your case and respond within the SLA timeline. You can track your grievance status using your Ticket ID.</p>
      <p>Thank you for reaching out to us.</p>
      <p style="color:#64748b;font-size:0.85rem">— CareDesk Support Team</p>
    </div>`
  );

const sendStatusUpdate = (grievance, newStatus) =>
  sendMail(
    grievance.customer_email,
    `Grievance Update — ${grievance.ticket_id}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#0f172a">Status Update</h2>
      <p>Dear ${grievance.customer_name},</p>
      <p>Your grievance <strong>${grievance.ticket_id}</strong> status has been updated to: <strong>${newStatus.toUpperCase()}</strong></p>
      <p>Log in to track the full timeline and details.</p>
      <p style="color:#64748b;font-size:0.85rem">— CareDesk Support Team</p>
    </div>`
  );

const sendResolutionEmail = (grievance) =>
  sendMail(
    grievance.customer_email,
    `Grievance Resolved — ${grievance.ticket_id}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#16a34a">Your Grievance Has Been Resolved</h2>
      <p>Dear ${grievance.customer_name},</p>
      <p>We're pleased to inform you that your grievance <strong>${grievance.ticket_id}</strong> has been resolved.</p>
      ${grievance.ai_response ? `<p><strong>Resolution:</strong></p><p>${grievance.ai_response}</p>` : ''}
      <p>We hope this resolution meets your expectations. Please share your feedback to help us improve.</p>
      <p style="color:#64748b;font-size:0.85rem">— CareDesk Support Team</p>
    </div>`
  );

module.exports = { sendAcknowledgement, sendStatusUpdate, sendResolutionEmail };
