const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Location = require('../models/Location');
const { toSafeUser } = require('../utils/safeUser');
const { geocodeAddress } = require('../services/locationService');
const { success, failure } = require('../utils/apiResponse');

// Phase 12: upserts the donor's saved pickup point. Geocodes the address so
// the map and "near me" searches have coordinates. Best effort - if the
// geocoder fails the address is still stored without coordinates.
async function saveDefaultLocation(userId, input) {
  const { addressLine, city, state, pincode } = input

  let donorProfile = await DonorProfile.findOne({ user: userId })
  if (!donorProfile) {
    donorProfile = await DonorProfile.create({ user: userId })
  }

  const point = await geocodeAddress({ addressLine, city, state, pincode })

  let location = donorProfile.defaultLocation
    ? await Location.findById(donorProfile.defaultLocation)
    : null

  if (location) {
    location.addressLine = addressLine
    location.city = city
    location.state = state
    location.pincode = pincode
    location.latitude = point.latitude
    location.longitude = point.longitude
    await location.save()
  } else {
    location = await Location.create({
      addressLine,
      city,
      state,
      pincode,
      latitude: point.latitude,
      longitude: point.longitude,
    })
    donorProfile.defaultLocation = location._id
    await donorProfile.save()
  }

  return donorProfile.populate('defaultLocation')
}

// GET /api/users/me - the authenticated user's profile + donor profile.
async function getMe(req, res) {
  const donorProfile = await DonorProfile.findOne({ user: req.user._id }).populate(
    'defaultLocation'
  )

  return success(res, 'Profile fetched successfully', {
    user: toSafeUser(req.user),
    donorProfile,
  })
}

// PATCH /api/users/me - update own profile fields (never email, password or role).
async function updateMe(req, res) {
  const { name, phone, about, defaultLocation } = req.body

  const userUpdates = {}
  if (name !== undefined) userUpdates.name = String(name).trim()
  if (phone !== undefined) userUpdates.phone = String(phone).trim()

  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne({ _id: req.user._id }, { $set: userUpdates })
  }

  if (defaultLocation !== undefined && req.user.role !== 'donor') {
    return failure(res, 'Only donors have a default pickup location', 400)
  }

  // The "about" note and default pickup location live on the donor profile
  // (created on first update).
  let donorProfile = null
  if (about !== undefined) {
    if (req.user.role !== 'donor') {
      return failure(res, 'Only donors have a donor profile', 400)
    }
    donorProfile = await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { about: String(about).trim() } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    ).populate('defaultLocation')
  }

  if (defaultLocation !== undefined) {
    donorProfile = await saveDefaultLocation(req.user._id, {
      addressLine: String(defaultLocation.addressLine).trim(),
      city: String(defaultLocation.city).trim(),
      state: String(defaultLocation.state).trim(),
      pincode: String(defaultLocation.pincode).trim(),
    })
  }

  const user = await User.findById(req.user._id)
  if (!donorProfile) {
    donorProfile = await DonorProfile.findOne({ user: req.user._id }).populate(
      'defaultLocation'
    )
  }

  return success(res, 'Profile updated successfully', {
    user: toSafeUser(user),
    donorProfile,
  })
}

module.exports = { getMe, updateMe };
