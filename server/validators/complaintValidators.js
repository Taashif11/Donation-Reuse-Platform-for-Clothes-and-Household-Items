const { body, param, query } = require('express-validator');
const { COMPLAINT_STATUSES, SETTABLE_COMPLAINT_STATUSES } = require('../utils/constants');

// POST /api/complaints - donor or organization raises a complaint.
const createComplaintRules = [
  body('subject')
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage('Subject must be between 5 and 150 characters'),

  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('donation')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Donation must be a valid id'),
];

// GET /api/complaints and GET /api/admin/complaints
const listComplaintRules = [
  query('status')
    .optional()
    .isIn(COMPLAINT_STATUSES)
    .withMessage('Invalid complaint status filter'),

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

// /api/complaints/:id  and  /api/admin/complaints/:id
const complaintIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid complaint id'),
];

// PATCH /api/admin/complaints/:id/status - the controller enforces the
// transition table and requires an adminResponse when resolving.
const adminUpdateStatusRules = [
  ...complaintIdRules,

  body('status')
    .isIn(SETTABLE_COMPLAINT_STATUSES)
    .withMessage('Status must be IN_REVIEW, RESOLVED or CLOSED'),

  body('adminResponse')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Admin response must be between 5 and 2000 characters'),
];

module.exports = {
  createComplaintRules,
  listComplaintRules,
  complaintIdRules,
  adminUpdateStatusRules,
};
