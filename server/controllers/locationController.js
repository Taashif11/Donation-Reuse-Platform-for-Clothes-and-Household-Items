const Location = require('../models/Location');
const Organization = require('../models/Organization');
const { geocodeAddress, isLiveGeocoding } = require('../services/locationService');
const { success, failure } = require('../utils/apiResponse');

// ---------------------------------------------------------------------------
// Phase 12 - map/location endpoints.
// Mounted behind protect in locationRoutes, so every role that is signed in
// (donor, organization, admin) can use them. Nothing here writes to the
// database - persisted locations are created by the profile/donation flows.
// ---------------------------------------------------------------------------

// GET /api/locations/geocode?addressLine=&city=&state=&pincode=
// Dry-run geocoding: returns coordinates without saving anything.
async function geocode(req, res) {
  const { addressLine, city, state, pincode } = req.query

  const point = await geocodeAddress({ addressLine, city, state, pincode })

  return success(res, 'Address geocoded successfully', {
    latitude: point.latitude,
    longitude: point.longitude,
    source: point.source,
    live: isLiveGeocoding() && point.source === 'live',
  })
}

// GET /api/locations/nearby?lat=&lng=&radiusKm=&limit=
// Approved organizations within radiusKm of the given point, nearest first.
async function nearbyOrganizations(req, res) {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const radiusKm = Number(req.query.radiusKm) || 25
  const limit = Number(req.query.limit) || 20

  // Only APPROVED organizations participate, and only those whose profile
  // address has been geocoded (location set with coordinates).
  const organizations = await Organization.find({
    verificationStatus: 'APPROVED',
    location: { $ne: null },
  })
    .select(
      'organizationName organizationType description city address contactPerson phone location'
    )
    .populate('location', 'addressLine city state pincode latitude longitude')

  const locationIds = organizations
    .map((org) => org.location)
    .filter((loc) => loc && loc.latitude != null && loc.longitude != null)
    .map((loc) => loc._id)

  if (locationIds.length === 0) {
    return success(res, 'Nearby organizations fetched successfully', {
      origin: { latitude: lat, longitude: lng },
      radiusKm,
      organizations: [],
    })
  }

  // $geoNear requires a 2dsphere index - added on Location in Phase 12.
  // distanceField comes back in metres; we convert to kilometres below.
  const nearPoints = await Location.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        query: { _id: { $in: locationIds } },
        spherical: true,
      },
    },
    { $project: { distanceMeters: 1 } },
  ])

  const distanceByLocation = new Map(
    nearPoints.map((point) => [String(point._id), point.distanceMeters])
  )

  const nearby = organizations
    .filter((org) => distanceByLocation.has(String(org.location?._id || org.location)))
    .map((org) => {
      const meters = distanceByLocation.get(String(org.location._id))
      return {
        _id: org._id,
        organizationName: org.organizationName,
        organizationType: org.organizationType,
        description: org.description,
        city: org.city,
        address: org.address,
        contactPerson: org.contactPerson,
        phone: org.phone,
        location: org.location,
        distanceKm: Number((meters / 1000).toFixed(2)),
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)

  return success(res, 'Nearby organizations fetched successfully', {
    origin: { latitude: lat, longitude: lng },
    radiusKm,
    organizations: nearby,
  })
}

module.exports = { geocode, nearbyOrganizations };
