const { body, param, query } = require('express-validator');
const { DONATION_STATUSES, ORGANIZATION_TYPES } = require('../utils/constants');

// GET /api/organizations - public directory filters and pagination.
const listPublicRules = [
  query('city')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 60 })
    .withMessage('City cannot exceed 60 characters'),

  query('search')
    .optional()
    .isString()
    .trim()
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

// PATCH /api/organizations/me - partial update of the caller's own profile.
// verificationStatus is never accepted here: only the admin can change it.
const updateOrganizationRules = [
  body('organizationName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Organization name must be between 2 and 120 characters'),

  body('organizationType')
    .optional({ values: 'falsy' })
    .isIn(ORGANIZATION_TYPES)
    .withMessage(`Organization type must be one of: ${ORGANIZATION_TYPES.join(', ')}`),

  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('contactPerson')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Contact person cannot exceed 80 characters'),

  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 7, max: 15 })
    .withMessage('Phone number must be between 7 and 15 characters'),

  body('address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  body('city')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 60 })
    .withMessage('City cannot exceed 60 characters'),

  body('state')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 60 })
    .withMessage('State cannot exceed 60 characters'),

  body('pincode')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9A-Za-z\s-]{3,10}$/)
    .withMessage('Please provide a valid pincode'),

  body('registrationNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Registration number cannot exceed 80 characters'),

  body('website')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Website cannot exceed 200 characters'),

  body('establishedYear')
    .optional({ values: 'falsy' })
    .isInt({ min: 1800, max: 2100 })
    .withMessage('Established year must be between 1800 and 2100'),

  body().custom((value) => {
    const fields = [
      'organizationName',
      'organizationType',
      'description',
      'contactPerson',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
      'registrationNumber',
      'website',
      'establishedYear',
    ]
    const hasField = value && typeof value === 'object' && fields.some((field) => field in value)
    if (!hasField) {
      throw new Error('Provide at least one organization field to update')
    }
    return true
  }),
];

// GET /api/organizations/:id - public profile lookup.
const organizationIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid organization id'),
];

// GET /api/organizations/me/donations
const listOrganizationDonationRules = [
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

// /api/organizations/me/donations/:id
const organizationDonationIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid donation id'),
];

// PATCH /api/organizations/me/donations/:id/status
const updateOrganizationStatusRules = [
  ...organizationDonationIdRules,

  body('status')
    .isIn(['ACCEPTED', 'REJECTED'])
    .withMessage('Organizations may only accept (ACCEPTED) or reject (REJECTED) requests'),

  body('rejectionReason')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Rejection reason cannot exceed 300 characters'),
];

module.exports = {
  listPublicRules,
  updateOrganizationRules,
  organizationIdRules,
  listOrganizationDonationRules,
  organizationDonationIdRules,
  updateOrganizationStatusRules,
};
