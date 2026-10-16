const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');
const {
  listNotificationRules,
  notificationIdRules,
} = require('../validators/notificationValidators');

const router = express.Router();

// In-app notifications belong to exactly one user - every query is scoped to
// req.user inside the controller, so any role may call these routes.
router.use(protect)

// GET /api/notifications  (?unread=&page=&limit=)
router.get('/', listNotificationRules, validate, listNotifications)

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount)

// PATCH /api/notifications/read-all
router.patch('/read-all', markAllNotificationsRead)

// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationIdRules, validate, markNotificationRead)

module.exports = router;
