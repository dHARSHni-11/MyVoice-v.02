/**
 * Computer Vision Validation Service — Node.js Client
 *
 * Calls the FastAPI CV micro-service to validate uploaded images.
 * Returns classification results and relevance confidence.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const logger = require('../utils/logger');

const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:8001';

/**
 * Send an image file to the CV micro-service for MobileNetV2 classification.
 *
 * @param {string} filePath – absolute or relative path to the image file
 * @returns {Promise<object>} { relevant, confidence, categoryMatch, labels }
 */
async function validateImage(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, '../../', filePath);

  if (!fs.existsSync(absolutePath)) {
    logger.warn(`CV validation skipped — file not found: ${absolutePath}`);
    return { relevant: false, confidence: 0, categoryMatch: null, labels: [] };
  }

  try {
    const result = await sendMultipartRequest(absolutePath);
    return {
      relevant: result.relevant,
      confidence: result.confidence,
      categoryMatch: result.category_match || null,
      labels: result.labels || [],
      model: result.model,
    };
  } catch (err) {
    logger.warn(`CV validation service error: ${err.message}`);
    // Graceful fallback — don't block grievance submission
    return { relevant: false, confidence: 0, categoryMatch: null, labels: [], error: err.message };
  }
}

/**
 * Send a multipart/form-data POST to the FastAPI /predict endpoint
 * using only built-in Node.js http module (no axios dependency).
 */
function sendMultipartRequest(filePath) {
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

    const options = {
      hostname: url.hostname,
      port: url.port || 8001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`CV service returned ${res.statusCode}: ${data}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`CV service response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('CV service request timed out'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = { validateImage };
