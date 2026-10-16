// Phase 12 - map/location API calls (/api/locations).
// Requires a signed-in account (protect on the server); any role may use them.
import api from './api'

const locationService = {
  // Dry-run geocoding: { addressLine, city, state?, pincode? } -> coordinates.
  // Nothing is saved - useful for previews and validation.
  geocode(params = {}) {
    return api.get('/locations/geocode', { params }).then((response) => response.data)
  },

  // Approved organizations within radiusKm of a point, nearest first.
  // params: { lat, lng, radiusKm?, limit? }
  // Returns { origin, radiusKm, organizations: [...with distanceKm] }.
  nearby(params = {}) {
    return api.get('/locations/nearby', { params }).then((response) => response.data)
  },
}

export default locationService
