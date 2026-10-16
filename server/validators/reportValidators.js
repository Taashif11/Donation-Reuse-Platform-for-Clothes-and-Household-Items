const { query } = require('express-validator');
const {
  DONATION_STATUSES,
  COLLECTION_STATUSES,
  COMPLAINT_STATUSES,
} = require('../utils/constants');

// Shared rules for every Phase 11 report/export query string.
// Only whitelisted parameters are ever read by the controllers - the client
// can never pass a raw MongoDB filter.

// startDate / endDate must be real ISO dates (YYYY-MM-DD or full ISO string).
// An unparseable value fails isISO8601 and returns 400 from the validate middleware.
const dateRangeRules = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO date (YYYY-MM-DD)'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO date (YYYY-MM-DD)'),

  query('endDate')
    .optional()
    .custom((value, { req }) => {
      const start = req.query.startDate
      if (start && new Date(start) > new Date(value)) {
        throw new Error('startDate must be on or before endDate')
      }
      return true
    }),
];

// GET /api/admin/reports/donations
const reportDonationRules = [
  query('status')
    .optional()
    .isIn(DONATION_STATUSES)
    .withMessage('Invalid donation status filter'),

  query('organization')
    .optional()
    .isMongoId()
    .withMessage('Invalid organization id'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  ...dateRangeRules,
];

// GET /api/admin/reports/collections
const reportCollectionRules = [
  query('status')
    .optional()
    .isIn(COLLECTION_STATUSES)
    .withMessage('Invalid collection status filter'),

  ...dateRangeRules,
];

// GET /api/admin/reports/complaints
const reportComplaintRules = [
  query('status')
    .optional()
    .isIn(COMPLAINT_STATUSES)
    .withMessage('Invalid complaint status filter'),

  ...dateRangeRules,
];

// CSV exports accept the same filters but never pagination.
const exportDonationRules = [
  query('status')
    .optional()
    .isIn(DONATION_STATUSES)
    .withMessage('Invalid donation status filter'),

  query('organization')
    .optional()
    .isMongoId()
    .withMessage('Invalid organization id'),

  ...dateRangeRules,
];

const exportCollectionRules = reportCollectionRules;
const exportComplaintRules = reportComplaintRules;

module.exports = {
  dateRangeRules,
  reportDonationRules,
  reportCollectionRules,
  reportComplaintRules,
  exportDonationRules,
  exportCollectionRules,
  exportComplaintRules,
};
