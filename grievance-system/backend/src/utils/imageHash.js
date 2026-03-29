/**
 * Perceptual Image Hashing Utility
 * Uses imghash to compute a pHash of uploaded images and
 * hamming distance to compare hashes for near-duplicate detection.
 */
const imghash = require('imghash');
const logger = require('./logger');

/**
 * Compute a 16-bit hex perceptual hash of an image file.
 * @param {string} filePath – absolute path to the image on disk
 * @returns {Promise<string|null>} hex hash string, or null on failure
 */
async function computeImageHash(filePath) {
  try {
    const hash = await imghash.hash(filePath, 16, 'hex');
    return hash;
  } catch (err) {
    logger.warn(`Image hash computation failed for ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Compute the Hamming distance between two hex hash strings.
 * Lower distance = more similar images.
 * @param {string} hash1
 * @param {string} hash2
 * @returns {number} number of differing bits
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    // XOR and count set bits
    let xor = n1 ^ n2;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

module.exports = { computeImageHash, hammingDistance };
