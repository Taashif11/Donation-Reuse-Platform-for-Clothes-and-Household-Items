const { body, param, query } = require('express-validator');
const { DONATION_STATUSES, ITEM_CONDITIONS } = require('../utils/constants');

// A pickup date must be today or later.
function notInPast(value) {
  const chosen = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return chosen >= today
}

// POST /api/donations
const createDonationRules = [
  body('organization')
    .isMongoId()
    .withMessage('A valid organization id is required'),

  body('pickupAddress')
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Pickup address must be between 5 and 300 characters'),

  // Phase 12: optional structured parts used to geocode the pickup point.
  // When omitted the donor's saved default location is used instead.
  body('pickupCity')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Pickup city must be between 2 and 60 characters'),

  body('pickupState')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Pickup state must be between 2 and 60 characters'),

  body('pickupPincode')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9A-Za-z\s-]{3,10}$/)
    .withMessage('Pickup pincode must be 3-10 letters, digits, spaces or dashes'),

  body('scheduledDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Pickup date must be a valid date')
    .bail()
    .custom(notInPast)
    .withMessage('Pickup date cannot be in the past'),

  body('scheduledTime')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 40 })
    .withMessage('Scheduled time cannot exceed 40 characters'),

  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('items')
    .isArray({ min: 1, max: 20 })
    .withMessage('At least one item is required (maximum 20)'),

  body('items.*.category')
    .isMongoId()
    .withMessage('Each item needs a valid category id'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be between 1 and 1000'),

  body('items.*.condition')
    .isIn(ITEM_CONDITIONS)
    .withMessage(`Condition must be one of: ${ITEM_CONDITIONS.join(', ')}`),

  body('items.*.itemType')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Item type cannot exceed 80 characters'),

  body('items.*.description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Item description cannot exceed 500 characters'),
];

// GET /api/donations
const listDonationRules = [
  query('status')
    .optional()
    .isIn(DONATION_STATUSES)
    .withMessage('Invalid status filter'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

// /api/donations/:id
const donationIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid donation id'),
];

// PATCH /api/donations/:id/status - donors may only cancel at this stage.
const updateStatusRules = [
  ...donationIdRules,

  body('status')
    .isIn(['CANCELLED'])
    .withMessage('Donors may only cancel donations (status CANCELLED)'),

  body('cancellationReason')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Cancellation reason cannot exceed 300 characters'),
];

module.exports = { createDonationRules, listDonationRules, donationIdRules, updateStatusRules };
