// Admin (Phase 9) API calls - every endpoint lives under /api/admin.
import api from './api'

const adminService = {
  // Dashboard counters: users, organizations, donations, recent activity.
  getStats() {
    return api.get('/admin/stats').then((response) => response.data)
  },

  // ---------- Users ----------
  listUsers(params = {}) {
    return api.get('/admin/users', { params }).then((response) => response.data)
  },

  // Activate or deactivate an account (admin cannot deactivate themselves).
  updateUserStatus(id, isActive) {
    return api
      .patch(`/admin/users/${id}/status`, { isActive })
      .then((response) => response.data)
  },

  // ---------- Organization verification ----------
  listOrganizations(params = {}) {
    return api.get('/admin/organizations', { params }).then((response) => response.data)
  },

  getOrganization(id) {
    return api.get(`/admin/organizations/${id}`).then((response) => response.data)
  },

  // verificationStatus: APPROVED | REJECTED | NEEDS_MORE_INFO
  verifyOrganization(id, payload) {
    return api
      .patch(`/admin/organizations/${id}/verify`, payload)
      .then((response) => response.data)
  },

  // ---------- Donation oversight (read-only) ----------
  listDonations(params = {}) {
    return api.get('/admin/donations', { params }).then((response) => response.data)
  },

  // ---------- Reports & exports (Phase 11) ----------
  // All under /api/admin/reports - admin only (401 without a token, 403 otherwise).

  // One call with every platform counter: donations, collections, complaints,
  // organizations and users.
  getReportOverview() {
    return api.get('/admin/reports/overview').then((response) => response.data)
  },

  // Filters: status, organization, startDate, endDate, page, limit.
  // Returns { summary, donations, pagination }.
  getDonationsReport(params = {}) {
    return api.get('/admin/reports/donations', { params }).then((response) => response.data)
  },

  // Filters: status, startDate, endDate. Returns { summary, activity }.
  getCollectionsReport(params = {}) {
    return api.get('/admin/reports/collections', { params }).then((response) => response.data)
  },

  getComplaintsReport(params = {}) {
    return api.get('/admin/reports/complaints', { params }).then((response) => response.data)
  },

  // CSV downloads: the server sends text/csv + Content-Disposition attachment,
  // so the response is requested as a Blob and saved by the page.
  exportDonationsCsv(params = {}) {
    return api.get('/admin/reports/export/donations', { params, responseType: 'blob' })
  },

  exportCollectionsCsv(params = {}) {
    return api.get('/admin/reports/export/collections', { params, responseType: 'blob' })
  },

  exportComplaintsCsv(params = {}) {
    return api.get('/admin/reports/export/complaints', { params, responseType: 'blob' })
  },
}

export default adminService
