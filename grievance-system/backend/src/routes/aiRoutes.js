const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { suggest, classify, analyze, summary, detectIssue, summarize } = require('../controllers/aiController');

router.use(aiLimiter);
router.post('/suggest', auth, requireRole('admin', 'officer'), suggest);
router.post('/classify', classify);
router.post('/analyze', analyze);
router.post('/detect-issue', detectIssue);
router.post('/summarize', summarize);
router.post('/summary', auth, requireRole('admin'), summary);

module.exports = router;
