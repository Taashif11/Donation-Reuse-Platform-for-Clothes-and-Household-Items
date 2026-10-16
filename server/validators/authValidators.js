const { body } = require('express-validator');

// POST /api/auth/register
// Note: 'admin' is intentionally not accepted - admin accounts are created by the platform team.
const registerRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address')
    .bail()
    .isLength({ max: 120 })
    .withMessage('Email cannot exceed 120 characters'),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be at least 6 characters'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9+()\s-]{7,15}$/)
    .withMessage('Enter a valid phone number (7-15 digits)'),

  body('role')
    .isIn(['donor', 'organization'])
    .withMessage('Role must be donor or organization'),
];

// POST /api/auth/login
const loginRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
