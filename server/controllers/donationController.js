const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const DonationItem = require('../models/DonationItem');
const Category = require('../models/Category');
const Organization = require('../models/Organization');
const CollectionRequest = require('../models/CollectionRequest');
const Location = require('../models/Location');
const DonorProfile = require('../models/DonorProfile');
const { DONATION_STATUSES, CANCELLABLE_DONATION_STATUSES } = require('../utils/constants');
const { createNotification } = require('../services/notificationService');
const { geocodeAddress } = require('../services/locationService');
const { success, failure } = require('../utils/apiResponse');

const ORG_FIELDS = 'organizationName city organizationType';
const ITEM_FIELDS = 'category itemType quantity condition description image';

// Phase 12: builds (and geocodes) the Location document for a new donation's
// pickup point. Explicit pickup* fields win; otherwise the donor's saved
// default location supplies the city/state/pincode. Best effort - any
// failure leaves pickupLocation null and the donation is still created.
async function createPickupLocation({ pickupAddress, pickupCity, pickupState, pickupPincode, donorProfile }) {
  const saved = donorProfile && donorProfile.defaultLocation ? donorProfile.defaultLocation : null

  const addressLine = String(pickupAddress).trim()
  const city = String(pickupCity || (saved ? saved.city : '') || '').trim()
  const state = String(pickupState || (saved ? saved.state : '') || '').trim()
  const pincode = String(pickupPincode || (saved ? saved.pincode : '') || '').trim()

  // The Location schema requires all four parts - skip when incomplete.
  if (!city || !state || !pincode) return null

  try {
    const point = await geocodeAddress({ addressLine, city, state, pincode })
    return await Location.create({
      addressLine,
      city,
      state,
      pincode,
      latitude: point.latitude,
      longitude: point.longitude,
    })
  } catch (error) {
    console.warn(`[donations] Could not store pickup location: ${error.message}`)
    return null
  }
}

// POST /api/donations - donor creates a donation request (status PENDING).
async function createDonation(req, res) {
  const {
    organization,
    pickupAddress,
    pickupCity,
    pickupState,
    pickupPincode,
    scheduledDate,
    scheduledTime,
    notes,
    items,
  } = req.body

  // Only verified organizations can receive donations.
  const org = await Organization.findOne({
    _id: organization,
    verificationStatus: 'APPROVED',
  })
  if (!org) {
    return failure(res, 'Verified organization not found', 404)
  }

  // Every referenced category must exist and be active.
  const categoryIds = [...new Set(items.map((item) => item.category))]
  const categories = await Category.find({ _id: { $in: categoryIds }, isActive: true })
  if (categories.length !== categoryIds.length) {
    return failure(res, 'One or more categories are invalid or inactive', 400)
  }

  const donation = await Donation.create({
    donor: req.user._id,
    organization: org._id,
    pickupAddress: String(pickupAddress).trim(),
    scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    scheduledTime: scheduledTime ? String(scheduledTime).trim() : '',
    notes: notes ? String(notes).trim() : '',
    status: 'PENDING',
  })

  // Phase 12: attach a geocoded pickup point (explicit fields or the
  // donor's saved default location).
  const donorProfile = await DonorProfile.findOne({ user: req.user._id }).populate(
    'defaultLocation'
  )
  donation.pickupLocation = await createPickupLocation({
    pickupAddress,
    pickupCity,
    pickupState,
    pickupPincode,
    donorProfile,
  })

  const donationItems = await DonationItem.insertMany(
    items.map((item) => ({
      donation: donation._id,
      category: item.category,
      itemType: item.itemType || '',
      quantity: item.quantity,
      condition: item.condition,
      description: item.description || '',
    }))
  )

  donation.items = donationItems.map((item) => item._id)
  await donation.save()

  const populated = await Donation.findById(donation._id)
    .populate('organization', ORG_FIELDS)
    .populate('items')
    .populate('pickupLocation')

  // Phase 10: tell the organization a new request is waiting.
  await createNotification({
    user: org.user,
    type: 'donation',
    title: 'New donation request',
    message: `${req.user.name} sent you a donation request.`,
    relatedDonation: donation._id,
  })

  return success(res, 'Donation created successfully', { donation: populated }, 201)
}

// GET /api/donations - only the authenticated donor's own donations.
async function listDonations(req, res) {
  const { status } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = { donor: req.user._id }
  if (status) filter.status = status

  const [total, donations] = await Promise.all([
    Donation.countDocuments(filter),
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organization', ORG_FIELDS)
      .populate('items', ITEM_FIELDS),
  ])

  return success(res, 'Donations fetched successfully', {
    donations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/donations/stats - dashboard numbers for the authenticated donor.
async function getDonationStats(req, res) {
  const donorId = new mongoose.Types.ObjectId(String(req.user._id))

  const rows = await Donation.aggregate([
    { $match: { donor: donorId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const byStatus = Object.fromEntries(DONATION_STATUSES.map((s) => [s, 0]))
  let total = 0
  for (const row of rows) {
    byStatus[row._id] = row.count
    total += row.count
  }

  const recent = await Donation.find({ donor: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('organization', ORG_FIELDS)
    .populate('items', ITEM_FIELDS)

  return success(res, 'Donation statistics fetched successfully', {
    stats: { total, byStatus, recent },
  })
}

// GET /api/donations/:id - own donation only; other donors get 404 (no existence leak).
async function getDonation(req, res) {
  const donation = await Donation.findOne({
    _id: req.params.id,
    donor: req.user._id,
  })
    .populate('organization', `${ORG_FIELDS} email phone address`)
    .populate({ path: 'items', populate: { path: 'category', select: 'name' } })
    .populate('pickupLocation')

  if (!donation) {
    return failure(res, 'Donation not found', 404)
  }

  return success(res, 'Donation fetched successfully', { donation })
}

// PATCH /api/donations/:id/status - donor cancels an eligible donation.
async function updateDonationStatus(req, res) {
  const { status, cancellationReason } = req.body

  const donation = await Donation.findOne({
    _id: req.params.id,
    donor: req.user._id,
  })
  if (!donation) {
    return failure(res, 'Donation not found', 404)
  }

  if (!CANCELLABLE_DONATION_STATUSES.includes(donation.status)) {
    return failure(
      res,
      `A donation with status ${donation.status} can no longer be cancelled`,
      400
    )
  }

  donation.status = status
  if (cancellationReason) donation.cancellationReason = String(cancellationReason).trim()
  await donation.save()

  // Keep any active pickup in sync with the cancelled donation.
  await CollectionRequest.updateMany(
    { donation: donation._id, status: { $ne: 'CANCELLED' } },
    { $set: { status: 'CANCELLED' } }
  )

  const populated = await Donation.findById(donation._id)
    .populate('organization', ORG_FIELDS)
    .populate('items', ITEM_FIELDS)

  // Phase 10: tell the organization the pickup will not happen.
  const targetOrganization = await Organization.findById(donation.organization).select(
    'user organizationName'
  )
  await createNotification({
    user: targetOrganization ? targetOrganization.user : null,
    type: 'donation',
    title: 'Donation cancelled',
    message: `${req.user.name} cancelled a donation${donation.cancellationReason ? `: ${donation.cancellationReason}` : '.'}`,
    relatedDonation: donation._id,
  })

  return success(res, 'Donation cancelled successfully', { donation: populated })
}

module.exports = {
  createDonation,
  listDonations,
  getDonationStats,
  getDonation,
  updateDonationStatus,
};
