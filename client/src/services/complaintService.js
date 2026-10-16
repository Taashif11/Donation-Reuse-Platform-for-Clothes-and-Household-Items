// Complaint API calls (Phase 10).
// /api/complaints is for the signed-in donor/organization (and admin reads),
// /api/admin/complaints is the admin work queue.
import api from './api'

const complaintService = {
  // ---------- /api/complaints ----------
  create(payload) {
    return api.post('/complaints', payload).then((response) => response.data)
  },

  // ?status=&page=&limit= - own complaints (admin sees every complaint).
  list(params = {}) {
    return api.get('/complaints', { params }).then((response) => response.data)
  },

  getById(id) {
    return api.get(`/complaints/${id}`).then((response) => response.data)
  },

  // ---------- /api/admin/complaints (admin only) ----------
  adminList(params = {}) {
    return api.get('/admin/complaints', { params }).then((response) => response.data)
  },

  adminGetById(id) {
    return api.get(`/admin/complaints/${id}`).then((response) => response.data)
  },

  // payload: { status, adminResponse }
  adminUpdateStatus(id, payload) {
    return api
      .patch(`/admin/complaints/${id}/status`, payload)
      .then((response) => response.data)
  },
}

export default complaintService
