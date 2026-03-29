const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { getStats, getOfficers, exportCSV } = require('../controllers/adminController');

router.use(auth, requireRole('admin', 'officer'));
router.get('/stats', getStats);
router.get('/officers', getOfficers);
router.get('/export', exportCSV);

module.exports = router;
