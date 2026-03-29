const router = require('express').Router();
const axios = require('axios');
const logger = require('../utils/logger');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8002';

// Proxy: POST /api/nlp/geocode → NLP service /geocode
router.post('/geocode', async (req, res) => {
  try {
    const response = await axios.post(`${NLP_SERVICE_URL}/geocode`, req.body, { timeout: 8000 });
    res.json(response.data);
  } catch (err) {
    logger.warn('NLP geocode proxy error:', err.message);
    res.status(502).json({ error: 'NLP geocoding service unavailable', success: false });
  }
});

// Proxy: POST /api/nlp/triage → NLP service /triage
router.post('/triage', async (req, res) => {
  try {
    const response = await axios.post(`${NLP_SERVICE_URL}/triage`, req.body, { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    logger.warn('NLP triage proxy error:', err.message);
    res.status(502).json({ error: 'NLP triage service unavailable' });
  }
});

// Health check for NLP service
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${NLP_SERVICE_URL}/health`, { timeout: 3000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'NLP service unreachable', status: 'down' });
  }
});

module.exports = router;
