const { body, param, query } = require('express-validator');
const { COLLECTION_STATUSES } = require('../utils/constants');

// A pickup date must be today or later.
function notInPast(value) {
  const chosen = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return chosen >= today
}

// POST /api/collections - schedule a collection for an accepted donation.
const scheduleRules = [
  body('donation')
    .isMongoId()
    .withMessage('A valid donation id is required'),

  body('scheduledDate')
    .isISO8601()
    .withMessage('Pickup date must be a valid date')
    .bail()
    .custom(notInPast)
    .withMessage('Pickup date cannot be in the past'),

  body('scheduledTime')
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage('Pickup time slot is required and cannot exceed 40 characters'),

  body('address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Pickup address must be between 5 and 300 characters'),

  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// PATCH /api/collections/:id - reschedule an existing pickup.
const rescheduleRules = [
  body('scheduledDate')
    .isISO8601()
    .withMessage('Pickup date must be a valid date')
    .bail()
    .custom(notInPast)
    .withMessage('Pickup date cannot be in the past'),

  body('scheduledTime')
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage('Pickup time slot is required and cannot exceed 40 characters'),

  body('address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Pickup address must be between 5 and 300 characters'),

  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// GET /api/collections
const listCollectionRules = [
  query('status')
    .optional()
    .isIn(COLLECTION_STATUSES)
    .withMessage('Invalid collection status filter'),

  query('donation')
    .optional()
    .isMongoId()
    .withMessage('Donation filter must be a valid id'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

// /api/collections/:id
const collectionIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid collection id'),
];

// PATCH /api/collections/:id/status - the receiving organization advances it.
// The controller additionally checks that the value is a legal next step.
const updateStatusRules = [
  ...collectionIdRules,

  body('status')
    .isIn(['PICKED_UP', 'RECEIVED', 'DISTRIBUTED'])
    .withMessage('Status must be PICKED_UP, RECEIVED or DISTRIBUTED'),
];

module.exports = {
  scheduleRules,
  rescheduleRules,
  listCollectionRules,
  collectionIdRules,
  updateStatusRules,
};
