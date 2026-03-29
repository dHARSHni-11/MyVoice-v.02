const path = require('path');
const Grievance = require('../models/Grievance');
const Department = require('../models/Department');
const { generateTicketId } = require('../utils/generateId');
const { classifyGrievance } = require('../services/aiService');
const { computeImageHash } = require('../utils/imageHash');
const { findDuplicate } = require('../services/deduplicationService');
const { calculatePriorityScore } = require('../services/priorityScoringService');
const { validateImage } = require('../services/cvValidationService');
const { sendAcknowledgement, sendStatusUpdate, sendResolutionEmail } = require('../services/emailService');
const { broadcastUpdate, notifyOfficer } = require('../services/notificationService');
const { checkSLA } = require('../services/slaService');
const { geocodeText, triageText } = require('../services/microserviceClient');
const logger = require('../utils/logger');

const submitGrievance = async (req, res, next) => {
  try {
    const {
      customerName, customerPhone, orderId, category, priority,
      subject, description, latitude, longitude,
    } = req.body;
    const customerEmail = req.user?.email || req.body.customerEmail;
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // ── Step 1: AI Classification ─────────────────────────────────
    let aiCategory = category || 'Other';
    let aiPriority = priority || 'medium';
    let sentiment = 'neutral';
    try {
      const classification = await classifyGrievance(description);
      aiCategory = classification.category || aiCategory;
      aiPriority = classification.priority || aiPriority;
      sentiment = classification.sentiment || sentiment;
    } catch (e) {
      logger.warn('AI classification failed:', e.message);
    }

    // ── Step 1b: NLP Geocoding (via microserviceClient) ──────────
    let geoDistrict = null;
    let geoState = null;
    let geoCountry = null;
    let geoLat = latitude ? parseFloat(latitude) : null;
    let geoLng = longitude ? parseFloat(longitude) : null;
    try {
      // Send only description (not subject+description) to avoid
      // overwhelming the geocoder with huge text strings
      const geoResult = await geocodeText(description);
      if (geoResult && geoResult.success) {
        geoLat = geoLat || geoResult.latitude;
        geoLng = geoLng || geoResult.longitude;
        geoDistrict = geoResult.district;
        geoState = geoResult.state;
        geoCountry = geoResult.country;
      }
    } catch (e) {
      logger.warn('NLP geocoding failed:', e.message);
    }

    // ── Step 1c: NLP Priority Triage (via microserviceClient) ────
    try {
      const triageResult = await triageText(description, subject);
      if (triageResult) {
        aiPriority = triageResult.priority || aiPriority;
        sentiment = triageResult.sentiment || sentiment;
        if (triageResult.category) {
          aiCategory = triageResult.category;
        }
      }
    } catch (e) {
      logger.warn('NLP triage failed:', e.message);
    }

    // ── Step 2: Compute Image Hash (pHash) ────────────────────────
    let imageHash = null;
    if (req.file) {
      const filePath = path.resolve(req.file.path || `uploads/${req.file.filename}`);
      imageHash = await computeImageHash(filePath);
    }

    // ── Step 3: Geospatial Deduplication ──────────────────────────
    const lat = geoLat || (latitude ? parseFloat(latitude) : null);
    const lng = geoLng || (longitude ? parseFloat(longitude) : null);

    const duplicate = await findDuplicate(lat, lng, imageHash, req.user?.id || null);
    if (duplicate) {
      return res.status(200).json({
        deduplicated: true,
        message: 'A similar open grievance already exists nearby. Your support has been added.',
        grievance: duplicate,
      });
    }

    // ── Step 4: Computer Vision Validation ────────────────────────
    let cvResult = null;
    let cvStatus = 'open';
    let cvMessage = null;
    if (req.file) {
      const filePath = path.resolve(req.file.path || `uploads/${req.file.filename}`);
      cvResult = await validateImage(filePath);

      if (cvResult && !cvResult.error && cvResult.confidence < 0.5) {
        cvStatus = 'pending_verification';
        cvMessage = 'The uploaded image could not be confidently verified as relevant. '
          + 'Please upload a clearer photo for faster processing.';
        logger.info(`CV validation: low confidence (${cvResult.confidence}) — flagging as pending_verification`);
      }
    }

    // ── Step 5: Department Mapping ────────────────────────────────
    const categoryToDepartment = (text) => {
      const n = (text || '').toLowerCase();
      if (n.includes('water') || n.includes('pipe') || n.includes('tap') || n.includes('drainage') || n.includes('sewage')) return 'Water';
      if (n.includes('road') || n.includes('pothole') || n.includes('street') || n.includes('footpath') || n.includes('pavement')) return 'Road';
      if (n.includes('electricity') || n.includes('power') || n.includes('light') || n.includes('electric') || n.includes('voltage') || n.includes('outage')) return 'Electricity';
      if (n.includes('garbage') || n.includes('sanitation') || n.includes('trash') || n.includes('waste') || n.includes('dustbin') || n.includes('sweeping')) return 'Garbage';
      return null;
    };

    // Use CV category if available, then AI category, then text scan
    let grievanceDepartment =
      (cvResult?.categoryMatch ? categoryToDepartment(cvResult.categoryMatch) : null) ||
      categoryToDepartment(aiCategory) ||
      categoryToDepartment(subject) ||
      categoryToDepartment(description) ||
      'General';

    // ── Step 6: Priority Score Calculation ─────────────────────────
    const priorityScore = calculatePriorityScore({
      priority: aiPriority,
      description,
      sentiment,
      createdAt: new Date(),
    });

    // ── Step 7: Create Grievance ──────────────────────────────────
    // Helper: truncate strings to prevent MySQL 'Data too long' errors
    const trunc = (val, max) => val && typeof val === 'string' ? val.slice(0, max) : val;

    const ticketId = generateTicketId();
    const grievance = await Grievance.create({
      ticketId,
      customerName: trunc(customerName, 100),
      customerEmail: trunc(customerEmail, 150),
      customerPhone: trunc(customerPhone, 20),
      orderId: trunc(orderId, 50),
      category: trunc(aiCategory, 50),
      priority: trunc(aiPriority, 20),
      department: trunc(grievanceDepartment, 50),
      subject: trunc(subject, 255),
      description,
      sentiment: trunc(sentiment, 20),
      attachmentUrl,
      latitude: lat, longitude: lng, imageHash, priorityScore,
      district: trunc(geoDistrict, 100),
      state: trunc(geoState, 100),
      country: trunc(geoCountry, 100),
    });

    // Override status if CV flagged it
    if (cvStatus === 'pending_verification') {
      await Grievance.updateStatus(grievance.id, 'pending_verification');
      grievance.status = 'pending_verification';
    }

    await Department.addUpdate({
      grievanceId: grievance.id, status: grievance.status,
      note: 'Grievance submitted', updatedBy: null,
    });
    sendAcknowledgement(grievance).catch(() => {});
    broadcastUpdate(grievance.id, { type: 'new', grievance });

    // Build response
    const response = { grievance, priorityScore };
    if (cvResult) response.cvValidation = cvResult;
    if (cvMessage) response.cvWarning = cvMessage;

    res.status(201).json(response);
  } catch (err) { next(err); }
};

const listGrievances = async (req, res, next) => {
  try {
    const { status, priority, category, department, search, sortBy, limit, offset } = req.query;
    let assignedTo;
    let customerEmail;
    let departmentFilter = department;
    if (!req.user) {
      // Public: show recent open grievances only
    } else if (req.user.role === 'officer') {
      assignedTo = req.user.id;
    } else if (req.user.role === 'customer') {
      customerEmail = req.user.email;
    } else if (req.user.role === 'admin') {
      departmentFilter = req.user.department || department;
    }
    const grievances = await Grievance.findAll({
      status, priority, category, department: departmentFilter,
      assignedTo, customerEmail, search, sortBy, limit, offset,
    });
    res.json({ grievances });
  } catch (err) { next(err); }
};

const getGrievance = async (req, res, next) => {
  try {
    const grievance = await Grievance.findByTicketId(req.params.id);
    if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
    const timeline = await Department.getUpdates(grievance.id);
    const notes = req.user ? await Department.getNotes(grievance.id) : [];
    const sla = checkSLA(grievance);
    res.json({ grievance, timeline, notes, sla });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const existing = await Grievance.findByTicketId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Grievance not found' });

    const updated = await Grievance.updateStatus(existing.id, status);
    await Department.addUpdate({ grievanceId: existing.id, status, note: note || `Status changed to ${status}`, updatedBy: req.user.id });

    if (status === 'resolved') sendResolutionEmail(updated).catch(() => {});
    else sendStatusUpdate(updated, status).catch(() => {});
    broadcastUpdate(existing.id, { type: 'status', status });

    res.json({ grievance: updated });
  } catch (err) { next(err); }
};

const assignOfficer = async (req, res, next) => {
  try {
    const { officerId } = req.body;
    const existing = await Grievance.findByTicketId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Grievance not found' });
    const updated = await Grievance.assignOfficer(existing.id, officerId);
    await Department.addUpdate({ grievanceId: existing.id, status: existing.status, note: 'Assigned to officer', updatedBy: req.user.id });
    notifyOfficer(officerId, { grievanceId: existing.id, ticketId: existing.ticket_id });
    res.json({ grievance: updated });
  } catch (err) { next(err); }
};

const addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const existing = await Grievance.findByTicketId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Grievance not found' });
    const newNote = await Department.addNote({ grievanceId: existing.id, note, authorId: req.user.id });
    res.status(201).json({ note: newNote });
  } catch (err) { next(err); }
};

const deleteGrievance = async (req, res, next) => {
  try {
    const existing = await Grievance.findByTicketId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Grievance not found' });
    await Grievance.softDelete(existing.id);
    res.json({ message: 'Grievance deleted' });
  } catch (err) { next(err); }
};

const upvoteGrievance = async (req, res, next) => {
  try {
    const existing = await Grievance.findByTicketId(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Grievance not found' });
    await Grievance.upvote(existing.id);
    res.json({ message: 'Upvoted' });
  } catch (err) { next(err); }
};

const getMapData = async (req, res, next) => {
  try {
    // ── Role-based department filtering ──
    // Super Admin (admin with no department): sees ALL grievances
    // Department Admin (admin with department): sees only their department
    // Officer: sees all (they may be cross-department)
    // Customer / Unauthenticated: sees all (public transparency)
    let departmentFilter;
    if (req.user && req.user.role === 'admin' && req.user.department) {
      departmentFilter = req.user.department;
    }

    const grievances = await Grievance.findAll({
      limit: 500,
      department: departmentFilter,
    });

    const PRIORITY_COLORS = {
      critical: '#ec4899',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
    };
    const STATUS_COLORS = {
      open: '#f59e0b',
      'in-progress': '#6366f1',
      resolved: '#10b981',
      closed: '#64748b',
      pending_verification: '#f97316',
    };
    const markers = grievances
      .filter(g => g.latitude && g.longitude)
      .map(g => ({
        id: g.id,
        ticket_id: g.ticket_id,
        subject: g.subject,
        description: g.description?.slice(0, 150),
        category: g.category,
        priority: g.priority,
        department: g.department,
        status: g.status,
        latitude: parseFloat(g.latitude),
        longitude: parseFloat(g.longitude),
        district: g.district,
        state: g.state,
        priority_score: g.priority_score || 50,
        priority_color: PRIORITY_COLORS[g.priority] || '#8b5cf6',
        status_color: STATUS_COLORS[g.status] || '#64748b',
        created_at: g.created_at,
        upvote_count: g.upvote_count || 0,
      }));
    res.json({
      markers,
      total: markers.length,
      filteredByDepartment: departmentFilter || null,
    });
  } catch (err) { next(err); }
};

module.exports = { submitGrievance, listGrievances, getGrievance, updateStatus, assignOfficer, addNote, deleteGrievance, upvoteGrievance, getMapData };
