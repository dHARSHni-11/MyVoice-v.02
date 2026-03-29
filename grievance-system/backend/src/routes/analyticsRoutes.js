const router = require('express').Router();
const { getHeatmapData, getLocationHierarchy } = require('../controllers/analyticsController');

// Public endpoints — no auth required for map visualization
router.get('/heatmap', getHeatmapData);
router.get('/locations', getLocationHierarchy);

module.exports = router;
