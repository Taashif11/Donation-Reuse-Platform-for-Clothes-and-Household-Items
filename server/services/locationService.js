// ---------------------------------------------------------------------------
// Phase 12 - modular map/location service.
//
// geocodeAddress() turns the structured address fields the platform already
// collects (addressLine, city, state, pincode) into latitude/longitude.
//
// It runs in one of two modes:
//   - live:   MAP_API_KEY is set -> Google Geocoding API (real coordinates)
//   - offline: no key -> a deterministic geocoder pinned to known city
//     centres, so the whole platform (donations, profiles, "near me")
//     works with zero external dependencies and zero cost.
//
// Every call is failure-tolerant: if the live provider is unreachable the
// offline geocoder is used as a fallback, and callers never see a throw for
// a network problem.
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 5000

// Rough city centres (latitude, longitude) for the offline geocoder.
// Keys are lower-cased city names as they appear in the seed/UI data.
const CITY_CENTROIDS = {
  chennai: [13.0827, 80.2707],
  coimbatore: [11.0168, 76.9558],
  madurai: [9.9252, 78.1198],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  pune: [18.5204, 73.8567],
  kolkata: [22.5726, 88.3639],
}

// Fallback centre (roughly middle of India) for unknown cities.
const DEFAULT_CENTROID = [20.5937, 78.9629]

// Maximum offset (~5 km) so offline points stay near the city centre but
// still differ per address.
const MAX_OFFSET_DEG = 0.05

// The .env.example ships a placeholder value - treat it as "no key".
function hasApiKey() {
  const key = process.env.MAP_API_KEY
  return Boolean(key) && !key.startsWith('your_')
}

function isLiveGeocoding() {
  return hasApiKey()
}

// FNV-1a style hash -> unsigned 32-bit int. Deterministic across processes.
function hashText(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// Pseudo-random floats in [0, 1) derived from the hash - stable per address.
function hashFractions(hash) {
  const a = (hash % 10007) / 10007
  const b = (Math.floor(hash / 10007) % 10009) / 10009
  return [a, b]
}

function offlineGeocode({ addressLine = '', city = '' }) {
  const key = String(city).trim().toLowerCase()
  const [baseLat, baseLng] = CITY_CENTROIDS[key] || DEFAULT_CENTROID

  const hash = hashText(`${String(addressLine).trim().toLowerCase()}|${key}`)
  const [ratioA, ratioB] = hashFractions(hash)

  // Spread points evenly around the centroid inside MAX_OFFSET_DEG.
  const latitude = Number((baseLat + (ratioA - 0.5) * 2 * MAX_OFFSET_DEG).toFixed(6))
  const longitude = Number((baseLng + (ratioB - 0.5) * 2 * MAX_OFFSET_DEG).toFixed(6))

  return { latitude, longitude, source: 'offline' }
}

async function liveGeocode(query) {
  const params = new URLSearchParams({
    address: query,
    key: process.env.MAP_API_KEY,
  })

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Geocoding provider responded with HTTP ${response.status}`)
  }

  const body = await response.json()
  const result = body.results && body.results[0]
  if (!result || !result.geometry || !result.geometry.location) {
    return null
  }

  return {
    latitude: Number(result.geometry.location.lat.toFixed(6)),
    longitude: Number(result.geometry.location.lng.toFixed(6)),
    source: 'live',
  }
}

// Public API: geocode the structured address the platform already stores.
// Never throws - always resolves to { latitude, longitude, source }.
async function geocodeAddress({ addressLine = '', city = '', state = '', pincode = '' } = {}) {
  const query = [addressLine, city, state, pincode].map((part) => String(part).trim()).filter(Boolean).join(', ')

  if (hasApiKey()) {
    try {
      const live = await liveGeocode(query)
      if (live) return live
    } catch (error) {
      console.warn(`[locationService] Live geocoding failed, using offline fallback: ${error.message}`)
    }
  }

  return offlineGeocode({ addressLine, city })
}

// Great-circle distance in kilometres - used by the nearby search.
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

module.exports = { geocodeAddress, haversineKm, isLiveGeocoding };
