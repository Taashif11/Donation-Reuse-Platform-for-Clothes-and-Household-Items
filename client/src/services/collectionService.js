// Collection (doorstep pickup) API calls, shared by donor and organization.
import api from './api'

const collectionService = {
  // Schedule the pickup of an accepted donation.
  create(payload) {
    return api.post('/collections', payload).then((response) => response.data)
  },

  // ?status=&donation=&page=&limit= - always scoped to the signed-in user.
  list(params = {}) {
    return api.get('/collections', { params }).then((response) => response.data)
  },

  getById(id) {
    return api.get(`/collections/${id}`).then((response) => response.data)
  },

  // Status timeline of the donation linked to this collection.
  getTracking(id) {
    return api.get(`/collections/${id}/tracking`).then((response) => response.data)
  },

  // Change date/time/address while the collection is still SCHEDULED.
  reschedule(id, payload) {
    return api.patch(`/collections/${id}`, payload).then((response) => response.data)
  },

  // Organization only: PICKED_UP -> RECEIVED -> DISTRIBUTED.
  updateStatus(id, payload) {
    return api.patch(`/collections/${id}/status`, payload).then((response) => response.data)
  },
}

export default collectionService
