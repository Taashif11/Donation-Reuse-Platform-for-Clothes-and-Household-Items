const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../utils/constants');

// Creates one in-app notification. Never throws: a notification failure must
// not change the status code or the payload of the request that triggered it.
async function createNotification({ user, type, title, message, relatedDonation = null }) {
  try {
    if (!user) return null

    return await Notification.create({
      user,
      type: NOTIFICATION_TYPES.includes(type) ? type : 'general',
      title: String(title).trim(),
      message: String(message).trim(),
      relatedDonation: relatedDonation || null,
      isRead: false,
    })
  } catch (error) {
    console.warn('[notifications] could not create notification:', error.message)
    return null
  }
}

// Fan-out helper: one notification per recipient id (deduplicated, skips empty).
async function notifyUsers(users, payload) {
  const ids = [...new Set((users || []).filter(Boolean).map(String))]
  await Promise.all(ids.map((id) => createNotification({ ...payload, user: id })))
}

module.exports = { createNotification, notifyUsers };
