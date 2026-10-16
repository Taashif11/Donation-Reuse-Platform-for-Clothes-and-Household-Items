const { body, param, query } = require('express-validator');
const {
  DONATION_STATUSES,
  USER_ROLES,
  VERIFICATION_STATUSES,
  VERIFIABLE_VERIFICATION_STATUSES,
} = require('../utils/constants');

// GET /api/admin/users
const listUserRules = [
  query('role')
    .optional()
    .isIn(USER_ROLES)
    .withMessage('Invalid role filter'),

  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status filter must be active or inactive'),

  query('q')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

// /api/admin/users/:id
const userIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user id'),
];

// PATCH /api/admin/users/:id/status
const userStatusRules = [
  ...userIdRules,

  body('isActive')
    .isBoolean()
    .withMessage('isActive must be true or false'),
];

// GET /api/admin/organizations
const listOrganizationRules = [
  query('verificationStatus')
    .optional()
    .isIn(VERIFICATION_STATUSES)
    .withMessage('Invalid verification status filter'),

  query('q')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

// /api/admin/organizations/:id
const organizationIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid organization id'),
];

// PATCH /api/admin/organizations/:id/verify
const verifyOrganizationRules = [
  ...organizationIdRules,

  body('verificationStatus')
    .isIn(VERIFIABLE_VERIFICATION_STATUSES)
    .withMessage(`verificationStatus must be one of: ${VERIFIABLE_VERIFICATION_STATUSES.join(', ')}`),

  body('verificationNotes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes cannot exceed 500 characters'),
];

// GET /api/admin/donations
const listAdminDonationRules = [
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

module.exports = {
  listUserRules,
  userIdRules,
  userStatusRules,
  listOrganizationRules,
  organizationIdRules,
  verifyOrganizationRules,
  listAdminDonationRules,
};
