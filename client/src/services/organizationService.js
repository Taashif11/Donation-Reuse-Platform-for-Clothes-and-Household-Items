// Organization (NGO/beneficiary) API calls.
import api from './api'

const organizationService = {
  // Public directory: only verified organizations are returned to visitors.
  getPublicList(params = {}) {
    return api.get('/organizations', { params }).then((response) => response.data)
  },

  getPublicById(id) {
    return api.get(`/organizations/${id}`).then((response) => response.data)
  },

  // ---------- Owner endpoints (organization role only) ----------
  getMyProfile() {
    return api.get('/organizations/me').then((response) => response.data)
  },

  updateMyProfile(payload) {
    return api.patch('/organizations/me', payload).then((response) => response.data)
  },

  getStats() {
    return api.get('/organizations/me/stats').then((response) => response.data)
  },

  listDonations(params = {}) {
    return api.get('/organizations/me/donations', { params }).then((response) => response.data)
  },

  getDonation(id) {
    return api.get(`/organizations/me/donations/${id}`).then((response) => response.data)
  },

  // Accept (ACCEPTED) or reject (REJECTED) an incoming donation request.
  updateDonationStatus(id, payload) {
    return api
      .patch(`/organizations/me/donations/${id}/status`, payload)
      .then((response) => response.data)
  },
}

export default organizationService
