/**
 * Microservice Client — Centralized connector for NLP & CV services
 *
 * Uses Railway internal networking URLs or falls back to localhost for local dev.
 * All inter-service calls go through this module.
 */
const axios = require('axios');
const logger = require('../utils/logger');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8002';
const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:8001';

// ── Shared Axios instances with defaults ──
const nlpClient = axios.create({
  baseURL: NLP_SERVICE_URL,
  timeout: 30000,  // 30s — geocoding rate-limits Nominatim at 1.1s/req
  headers: { 'Content-Type': 'application/json' },
});

const cvClient = axios.create({
  baseURL: CV_SERVICE_URL,
  timeout: 30000,
});

// ── NLP Service Methods ──

/**
 * Geocode text using the NLP service's spaCy NER + Nominatim pipeline.
 * @param {string} text — grievance description text
 * @returns {Promise<object>} { success, latitude, longitude, district, state, country, ... }
 */
async function geocodeText(text) {
  try {
    const res = await nlpClient.post('/geocode', { text });
    return res.data;
  } catch (err) {
    logger.warn(`NLP geocode failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Triage text using the NLP service's priority classification pipeline.
 * @param {string} text — grievance description
 * @param {string} subject — grievance subject line
 * @returns {Promise<object>} { priority, priority_score, confidence, category, sentiment, ... }
 */
async function triageText(text, subject = '') {
  try {
    const res = await nlpClient.post('/triage', { text, subject });
    return res.data;
  } catch (err) {
    logger.warn(`NLP triage failed: ${err.message}`);
    return null;
  }
}

/**
 * Check NLP service health.
 * @returns {Promise<object>} { status, service, version }
 */
async function checkNlpHealth() {
  try {
    const res = await nlpClient.get('/health');
    return res.data;
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

// ── CV Service Methods ──

/**
 * Validate an image by sending it to the CV service's MobileNetV2 classifier.
 * Uses built-in Node.js http for multipart upload (avoids FormData dep).
 * @param {string} filePath — absolute path to the image file
 * @returns {Promise<object>} { relevant, confidence, category_match, labels }
 */
async function validateImageViaCV(filePath) {
  const fs = require('fs');
  const path = require('path');
  const http = require('http');
  const https = require('https');

  if (!fs.existsSync(filePath)) {
    logger.warn(`CV validation skipped — file not found: ${filePath}`);
    return { relevant: false, confidence: 0, categoryMatch: null, labels: [] };
  }

  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const fileStream = fs.readFileSync(filePath);
    const boundary = `----FormBoundary${Date.now()}`;

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: image/${path.extname(fileName).slice(1) || 'jpeg'}\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileStream, footer]);

    const url = new URL(`${CV_SERVICE_URL}/predict`);
    const transport = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 8001),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      timeout: 30000,
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`CV service returned ${res.statusCode}: ${data}`));
            return;
          }
          const result = JSON.parse(data);
          resolve({
            relevant: result.relevant,
            confidence: result.confidence,
            categoryMatch: result.category_match || null,
            labels: result.labels || [],
            model: result.model,
          });
        } catch (e) {
          reject(new Error(`CV service response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      logger.warn(`CV validation service error: ${err.message}`);
      resolve({ relevant: false, confidence: 0, categoryMatch: null, labels: [], error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ relevant: false, confidence: 0, categoryMatch: null, labels: [], error: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

/**
 * Check CV service health.
 * @returns {Promise<object>} { status, model }
 */
async function checkCvHealth() {
  try {
    const res = await cvClient.get('/health');
    return res.data;
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

module.exports = {
  // NLP
  geocodeText,
  triageText,
  checkNlpHealth,
  // CV
  validateImageViaCV,
  checkCvHealth,
  // URLs (for reference)
  NLP_SERVICE_URL,
  CV_SERVICE_URL,
};
