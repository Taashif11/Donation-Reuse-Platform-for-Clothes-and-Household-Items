const Notification = require('../models/Notification');
const { success, failure } = require('../utils/apiResponse');

// GET /api/notifications - the signed-in user's own notifications, newest first.
// ?unread=true|false  ?page=  ?limit=
async function listNotifications(req, res) {
  const { unread } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = { user: req.user._id }
  if (unread === 'true') filter.isRead = false
  if (unread === 'false') filter.isRead = true

  const [total, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  return success(res, 'Notifications fetched successfully', {
    notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/notifications/unread-count - drives the bell badge.
async function getUnreadCount(req, res) {
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  })

  return success(res, 'Unread notification count fetched successfully', { unreadCount })
}

// PATCH /api/notifications/:id/read - mark one of your notifications as read.
async function markNotificationRead(req, res) {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
  if (!notification) {
    return failure(res, 'Notification not found', 404)
  }

  if (notification.isRead) {
    return failure(res, 'Notification is already read', 400)
  }

  notification.isRead = true
  await notification.save()

  return success(res, 'Notification marked as read', { notification })
}

// PATCH /api/notifications/read-all - clears the badge in one call.
async function markAllNotificationsRead(req, res) {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  )

  return success(res, 'All notifications marked as read', {
    modifiedCount: result.modifiedCount,
  })
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
