const { body, param, query } = require('express-validator');

// GET /api/notifications
const listNotificationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('unread')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Unread filter must be true or false'),
];

// /api/notifications/:id
const notificationIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid notification id'),
];

module.exports = {
  listNotificationRules,
  notificationIdRules,
};
