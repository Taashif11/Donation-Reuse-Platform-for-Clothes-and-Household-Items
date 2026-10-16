// In-app notification API calls (Phase 10).
// Every endpoint is scoped to the signed-in user on the server, so the same
// service works for donor, organization and admin accounts.
import api from './api'

const notificationService = {
  // ?unread=true|false  ?page=  ?limit= - newest first.
  list(params = {}) {
    return api.get('/notifications', { params }).then((response) => response.data)
  },

  // Drives the unread badge next to the bell.
  getUnreadCount() {
    return api.get('/notifications/unread-count').then((response) => response.data)
  },

  markRead(id) {
    return api.patch(`/notifications/${id}/read`).then((response) => response.data)
  },

  markAllRead() {
    return api.patch('/notifications/read-all').then((response) => response.data)
  },
}

export default notificationService
