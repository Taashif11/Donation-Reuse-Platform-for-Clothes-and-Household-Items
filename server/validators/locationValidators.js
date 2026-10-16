const { query } = require('express-validator');

// Phase 12 - query rules for /api/locations/*.
// Only whitelisted parameters are read by the controller.

// GET /api/locations/geocode
const geocodeRules = [
  query('addressLine')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('addressLine must be between 5 and 200 characters'),

  query('city')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('city must be between 2 and 60 characters'),

  query('state')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 60 })
    .withMessage('state cannot exceed 60 characters'),

  query('pincode')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9A-Za-z\s-]{3,10}$/)
    .withMessage('pincode must be 3-10 letters, digits, spaces or dashes'),
];

// GET /api/locations/nearby
const nearbyRules = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be a number between -90 and 90'),

  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng must be a number between -180 and 180'),

  query('radiusKm')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('radiusKm must be between 1 and 100'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];

module.exports = { geocodeRules, nearbyRules };
