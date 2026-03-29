/**
 * Verifiable Priority Scoring Service
 *
 * Computes a numeric score P ∈ [0, 100] using:
 *   P = (0.4 × Urgency_Score) + (0.3 × Safety_Risk_Multiplier)
 *     + (0.2 × Sentiment_Weight) + (0.1 × SLA_Age)
 *
 * Each sub-score is normalised to [0, 100].
 */

const SLA_HOURS = { critical: 24, high: 48, medium: 72, low: 120 };

// ── Urgency Score (from AI-assigned priority) ──────────────────────
const URGENCY_MAP = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

function getUrgencyScore(priority) {
  return URGENCY_MAP[(priority || 'medium').toLowerCase()] ?? 50;
}

// ── Safety Risk Multiplier (keyword scan) ──────────────────────────
const SAFETY_KEYWORDS = {
  100: ['electrocution', 'collapse', 'explosion', 'fatal', 'death', 'fire'],
  85:  ['flood', 'sinkhole', 'gas leak', 'live wire', 'short circuit', 'exposed wire'],
  70:  ['dangerous', 'hazardous', 'toxic', 'contaminated', 'overflowing sewage'],
  55:  ['broken', 'damaged', 'cracked', 'unstable', 'leaking'],
  40:  ['pothole', 'debris', 'obstruction', 'waterlogging'],
  25:  ['inconvenience', 'delay', 'slow', 'noisy'],
};

function getSafetyRiskScore(description) {
  const text = (description || '').toLowerCase();
  for (const [score, keywords] of Object.entries(SAFETY_KEYWORDS).sort((a, b) => b[0] - a[0])) {
    for (const kw of keywords) {
      if (text.includes(kw)) return parseInt(score);
    }
  }
  return 20; // baseline risk for unmatched descriptions
}

// ── Sentiment Weight (from AI sentiment) ───────────────────────────
const SENTIMENT_MAP = {
  angry: 100,
  urgent: 85,
  frustrated: 75,
  neutral: 40,
  positive: 20,
};

function getSentimentWeight(sentiment) {
  return SENTIMENT_MAP[(sentiment || 'neutral').toLowerCase()] ?? 40;
}

// ── SLA Age Factor ─────────────────────────────────────────────────
/**
 * Returns a 0-100 score based on how close the ticket is to SLA breach.
 * At 0 hours elapsed → 0.  At SLA limit → 100.  Beyond → capped at 100.
 */
function getSLAAgeScore(priority, createdAt) {
  const slaLimit = SLA_HOURS[(priority || 'medium').toLowerCase()] || 72;
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.min(100, Math.round((elapsed / slaLimit) * 100));
}

// ── Main scorer ────────────────────────────────────────────────────
/**
 * Calculate the composite priority score.
 *
 * @param {object} params
 * @param {string} params.priority    – AI-assigned priority (low/medium/high/critical)
 * @param {string} params.description – grievance description text
 * @param {string} params.sentiment   – AI-detected sentiment
 * @param {Date|string} params.createdAt – ticket creation timestamp
 * @returns {number} P ∈ [0, 100], rounded to 2 decimal places
 */
function calculatePriorityScore({ priority, description, sentiment, createdAt }) {
  const urgency     = getUrgencyScore(priority);
  const safetyRisk  = getSafetyRiskScore(description);
  const sentWeight  = getSentimentWeight(sentiment);
  const slaAge      = getSLAAgeScore(priority, createdAt || new Date());

  const P = (0.4 * urgency) + (0.3 * safetyRisk) + (0.2 * sentWeight) + (0.1 * slaAge);

  return Math.round(Math.min(100, Math.max(0, P)) * 100) / 100;
}

module.exports = {
  calculatePriorityScore,
  // Exposed for testing / transparency
  getUrgencyScore,
  getSafetyRiskScore,
  getSentimentWeight,
  getSLAAgeScore,
};
