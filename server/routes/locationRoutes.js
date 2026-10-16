const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { geocode, nearbyOrganizations } = require('../controllers/locationController');
const { geocodeRules, nearbyRules } = require('../validators/locationValidators');

// Phase 12 - map/location endpoints, mounted at /api/locations.
const router = express.Router();

// GET /api/locations/geocode?addressLine=&city=&state=&pincode=
// Signed-in only (donor/org flows): geocoding is proxied through the API so
// the provider key (if any) is never exposed to the browser.
router.get('/geocode', protect, geocodeRules, validate, geocode)

// GET /api/locations/nearby?lat=&lng=&radiusKm=&limit=
// Public: returns only APPROVED organizations - the same records the public
// directory already exposes - so anonymous visitors on /ngos can use
// "near me" without an account.
router.get('/nearby', nearbyRules, validate, nearbyOrganizations)

module.exports = router;
