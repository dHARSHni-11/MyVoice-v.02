/**
 * Geospatial Deduplication Service
 *
 * When a new grievance arrives with GPS coordinates:
 *   1. Find all open tickets within a 20-meter radius (Haversine SQL)
 *   2. Compare image pHashes — if hamming distance ≤ 10, treat as duplicate
 *   3. Increment upvote_count on existing ticket, link the new user
 *   4. Return the existing ticket (caller skips creating a new one)
 */
const { query } = require('../models/db');
const { hammingDistance } = require('../utils/imageHash');
const crypto = require('crypto');
const logger = require('../utils/logger');

const RADIUS_METERS = 20;
const PHASH_THRESHOLD = 10; // max hamming distance to consider "same image"

/**
 * Check for a nearby duplicate open grievance.
 *
 * @param {number} lat        – latitude of the new submission
 * @param {number} lng        – longitude of the new submission
 * @param {string|null} imageHash – pHash of the new image (or null)
 * @param {string|null} userId    – submitting user's ID
 * @returns {Promise<object|null>} existing grievance row if duplicate, else null
 */
async function findDuplicate(lat, lng, imageHash, userId) {
  if (lat == null || lng == null) return null;

  // Haversine formula in SQL — returns open tickets within RADIUS_METERS
  const haversineSQL = `
    SELECT *,
      (6371000 * ACOS(
        LEAST(1, COS(RADIANS(?)) * COS(RADIANS(latitude))
        * COS(RADIANS(longitude) - RADIANS(?))
        + SIN(RADIANS(?)) * SIN(RADIANS(latitude)))
      )) AS distance_m
    FROM grievances
    WHERE is_deleted = 0
      AND status IN ('open', 'in_progress', 'assigned')
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    HAVING distance_m <= ?
    ORDER BY distance_m ASC
  `;

  const result = await query(haversineSQL, [lat, lng, lat, RADIUS_METERS]);
  const nearby = result.rows;

  if (!nearby || nearby.length === 0) return null;

  // If no image hash to compare, just check proximity
  if (!imageHash) {
    logger.info(`Nearby open ticket found by location only: ${nearby[0].ticket_id}`);
    return null; // require image match for dedup
  }

  // Compare pHashes with each nearby ticket
  for (const ticket of nearby) {
    if (!ticket.image_hash) continue;

    const dist = hammingDistance(imageHash, ticket.image_hash);
    if (dist <= PHASH_THRESHOLD) {
      logger.info(
        `Duplicate detected: new submission matches ticket ${ticket.ticket_id} ` +
        `(distance=${ticket.distance_m.toFixed(1)}m, pHash hamming=${dist})`
      );

      // Increment upvote count
      await query(
        'UPDATE grievances SET upvote_count = upvote_count + 1 WHERE id = ?',
        [ticket.id]
      );

      // Link the user to this ticket (if userId provided)
      if (userId) {
        try {
          const upvoterId = crypto.randomUUID();
          await query(
            `INSERT INTO grievance_upvoters (id, grievance_id, user_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
            [upvoterId, ticket.id, userId]
          );
        } catch (e) {
          logger.warn(`Failed to link upvoter: ${e.message}`);
        }
      }

      // Re-fetch after upvote increment
      const updated = await query('SELECT * FROM grievances WHERE id = ?', [ticket.id]);
      return updated.rows[0];
    }
  }

  return null; // no image-matching duplicate found
}

module.exports = { findDuplicate };
