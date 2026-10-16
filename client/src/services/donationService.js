// Donation API calls (donor-only endpoints).
import api from './api'

const donationService = {
  create(payload) {
    return api.post('/donations', payload).then((response) => response.data)
  },

  list(params = {}) {
    return api.get('/donations', { params }).then((response) => response.data)
  },

  getStats() {
    return api.get('/donations/stats').then((response) => response.data)
  },

  getById(id) {
    return api.get(`/donations/${id}`).then((response) => response.data)
  },

  updateStatus(id, payload) {
    return api.patch(`/donations/${id}/status`, payload).then((response) => response.data)
  },
}

export default donationService
