const Grievance = require('../models/Grievance');
const logger = require('../utils/logger');

/**
 * District coordinate lookup for known Indian districts.
 * Used for auto-zoom when a district is selected.
 */
const DISTRICT_COORDS = {
  // Tamil Nadu
  'Chennai': { lat: 13.0827, lng: 80.2707, zoom: 12 },
  'Coimbatore': { lat: 11.0168, lng: 76.9558, zoom: 12 },
  'Madurai': { lat: 9.9252, lng: 78.1198, zoom: 12 },
  'Salem': { lat: 11.6643, lng: 78.1460, zoom: 12 },
  'Tiruchirappalli': { lat: 10.7905, lng: 78.7047, zoom: 12 },
  'Tirunelveli': { lat: 8.7139, lng: 77.7567, zoom: 12 },
  'Erode': { lat: 11.3410, lng: 77.7172, zoom: 12 },
  'Vellore': { lat: 12.9165, lng: 79.1325, zoom: 12 },
  'Chengalpattu': { lat: 12.6921, lng: 79.9707, zoom: 12 },
  // Karnataka
  'Bengaluru': { lat: 12.9716, lng: 77.5946, zoom: 12 },
  'Mysuru': { lat: 12.2958, lng: 76.6394, zoom: 12 },
  // Andhra Pradesh
  'Hyderabad': { lat: 17.3850, lng: 78.4867, zoom: 12 },
  'Visakhapatnam': { lat: 17.6868, lng: 83.2185, zoom: 12 },
  // Kerala
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366, zoom: 12 },
  'Kochi': { lat: 9.9312, lng: 76.2673, zoom: 12 },
  // North India
  'New Delhi': { lat: 28.6139, lng: 77.2090, zoom: 12 },
  'Mumbai': { lat: 19.0760, lng: 72.8777, zoom: 12 },
  'Kolkata': { lat: 22.5726, lng: 88.3639, zoom: 12 },
  'Pune': { lat: 18.5204, lng: 73.8567, zoom: 12 },
  'Jaipur': { lat: 26.9124, lng: 75.7873, zoom: 12 },
  'Lucknow': { lat: 26.8467, lng: 80.9462, zoom: 12 },
};

/**
 * Country → State → District hierarchy for cascading dropdowns.
 */
const LOCATION_HIERARCHY = {
  'India': {
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Erode', 'Vellore', 'Chengalpattu'],
    'Karnataka': ['Bengaluru', 'Mysuru'],
    'Andhra Pradesh': ['Hyderabad', 'Visakhapatnam'],
    'Kerala': ['Thiruvananthapuram', 'Kochi'],
    'Delhi': ['New Delhi'],
    'Maharashtra': ['Mumbai', 'Pune'],
    'West Bengal': ['Kolkata'],
    'Rajasthan': ['Jaipur'],
    'Uttar Pradesh': ['Lucknow'],
  },
};

/**
 * GET /api/analytics/heatmap?district=NAME&state=NAME&country=NAME
 * Returns heatmap data points: [lat, lng, intensity]
 */
const getHeatmapData = async (req, res, next) => {
  try {
    const { district, state, country } = req.query;

    // Fetch all grievances and filter by location
    const grievances = await Grievance.findAll({ limit: 500 });

    let filtered = grievances
      .filter(g => g.latitude && g.longitude)
      .filter(g => g.status !== 'resolved' && g.status !== 'closed');

    // Apply location filters
    if (district) {
      filtered = filtered.filter(g =>
        (g.district || '').toLowerCase() === district.toLowerCase()
      );
    }
    if (state) {
      filtered = filtered.filter(g =>
        (g.state || '').toLowerCase() === state.toLowerCase()
      );
    }
    if (country) {
      filtered = filtered.filter(g =>
        (g.country || '').toLowerCase() === country.toLowerCase()
      );
    }

    // Map to heat points: [lat, lng, intensity]
    // Intensity = priority_score / 100 (0.0 → 1.0), minimum 0.1
    const heatPoints = filtered.map(g => {
      const score = parseFloat(g.priority_score) || 50;
      const intensity = Math.max(0.1, Math.min(1.0, score / 100));
      return [
        parseFloat(g.latitude),
        parseFloat(g.longitude),
        intensity,
      ];
    });

    // Compute aggregated stats
    const stats = {
      total: filtered.length,
      critical: filtered.filter(g => g.priority === 'critical').length,
      high: filtered.filter(g => g.priority === 'high').length,
      medium: filtered.filter(g => g.priority === 'medium').length,
      low: filtered.filter(g => g.priority === 'low').length,
      avgScore: filtered.length > 0
        ? Math.round(filtered.reduce((acc, g) => acc + (parseFloat(g.priority_score) || 0), 0) / filtered.length)
        : 0,
      categories: {},
    };

    // Category breakdown
    filtered.forEach(g => {
      const cat = g.category || 'Other';
      stats.categories[cat] = (stats.categories[cat] || 0) + 1;
    });

    // District center coordinates for auto-zoom
    const districtInfo = district ? (DISTRICT_COORDS[district] || null) : null;

    res.json({
      heatPoints,
      stats,
      districtInfo,
      filters: { district, state, country },
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/analytics/locations
 * Returns cascading location hierarchy for Country → State → District dropdowns.
 */
const getLocationHierarchy = async (req, res, next) => {
  try {
    // Also extract unique locations from actual grievance data
    const grievances = await Grievance.findAll({ limit: 500 });
    const dynamicLocations = {};

    grievances.forEach(g => {
      if (g.country && g.state && g.district) {
        if (!dynamicLocations[g.country]) dynamicLocations[g.country] = {};
        if (!dynamicLocations[g.country][g.state]) dynamicLocations[g.country][g.state] = new Set();
        dynamicLocations[g.country][g.state].add(g.district);
      }
    });

    // Merge static hierarchy with dynamic data
    const merged = JSON.parse(JSON.stringify(LOCATION_HIERARCHY));
    for (const [country, states] of Object.entries(dynamicLocations)) {
      if (!merged[country]) merged[country] = {};
      for (const [state, districts] of Object.entries(states)) {
        if (!merged[country][state]) merged[country][state] = [];
        districts.forEach(d => {
          if (!merged[country][state].includes(d)) {
            merged[country][state].push(d);
          }
        });
        merged[country][state].sort();
      }
    }

    res.json({ hierarchy: merged });
  } catch (err) { next(err); }
};

module.exports = { getHeatmapData, getLocationHierarchy, DISTRICT_COORDS };
