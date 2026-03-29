const router = require('express').Router();
const { geocodeText, triageText, checkNlpHealth } = require('../services/microserviceClient');
const logger = require('../utils/logger');

// Proxy: POST /api/nlp/geocode → NLP service /geocode
router.post('/geocode', async (req, res) => {
  try {
    const result = await geocodeText(req.body.text);
    if (result.error && !result.success) {
      return res.status(502).json({ error: 'NLP geocoding service unavailable', success: false });
    }
    res.json(result);
  } catch (err) {
    logger.warn('NLP geocode proxy error:', err.message);
    res.status(502).json({ error: 'NLP geocoding service unavailable', success: false });
  }
});

// Proxy: POST /api/nlp/triage → NLP service /triage
router.post('/triage', async (req, res) => {
  try {
    const result = await triageText(req.body.text, req.body.subject);
    if (!result) {
      return res.status(502).json({ error: 'NLP triage service unavailable' });
    }
    res.json(result);
  } catch (err) {
    logger.warn('NLP triage proxy error:', err.message);
    res.status(502).json({ error: 'NLP triage service unavailable' });
  }
});

// Health check for NLP service
router.get('/health', async (req, res) => {
  const health = await checkNlpHealth();
  if (health.status === 'down') {
    return res.status(502).json(health);
  }
  res.json(health);
});

module.exports = router;
