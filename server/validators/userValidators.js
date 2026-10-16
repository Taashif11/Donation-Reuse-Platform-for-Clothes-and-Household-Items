const { body } = require('express-validator');

// PATCH /api/users/me - partial update: at least one field must be present.
const updateMeRules = [
  body('name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9+()\s-]{7,15}$/)
    .withMessage('Enter a valid phone number (7-15 digits)'),

  body('about')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('About cannot exceed 300 characters'),

  // Phase 12: donors can save a reusable pickup point (all four parts are
  // required together so the Location document is always complete).
  body('defaultLocation')
    .optional()
    .isObject()
    .withMessage('defaultLocation must be an object'),

  body('defaultLocation.addressLine')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Pickup address must be between 5 and 200 characters'),

  body('defaultLocation.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('City must be between 2 and 60 characters'),

  body('defaultLocation.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('State must be between 2 and 60 characters'),

  body('defaultLocation.pincode')
    .optional()
    .trim()
    .matches(/^[0-9A-Za-z\s-]{3,10}$/)
    .withMessage('Pincode must be 3-10 letters, digits, spaces or dashes'),

  body().custom((value) => {
    const hasField = value && typeof value === 'object' &&
      ['name', 'phone', 'about', 'defaultLocation'].some((field) => field in value)
    if (!hasField) {
      throw new Error(
        'Provide at least one field to update (name, phone, about or defaultLocation)'
      )
    }

    // defaultLocation is only stored as a complete address.
    if (value.defaultLocation !== undefined) {
      const location = value.defaultLocation
      const complete =
        location &&
        typeof location === 'object' &&
        ['addressLine', 'city', 'state', 'pincode'].every(
          (field) => typeof location[field] === 'string' && location[field].trim().length > 0
        )
      if (!complete) {
        throw new Error(
          'defaultLocation needs addressLine, city, state and pincode'
        )
      }
    }

    return true
  }),
];

module.exports = { updateMeRules };
