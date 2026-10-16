const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Donation = require('../models/Donation');
const DonationItem = require('../models/DonationItem');
const {
  DONATION_STATUSES,
  ORGANIZATION_TRANSITIONS,
  IGNORED_ORGANIZATION_STATUSES,
} = require('../utils/constants');
const { success, failure } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');
const Location = require('../models/Location');
const { geocodeAddress } = require('../services/locationService');

const ORG_FIELDS =
  'organizationName organizationType description contactPerson email phone address city state pincode location verificationStatus verificationDetails verificationNotes verificationDocuments verifiedAt createdAt';
const DONOR_FIELDS = 'name email phone';
const ITEM_FIELDS = 'category itemType quantity condition description image';

// Escapes user input before it is used inside a regular expression.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Phase 12: keeps a geocoded Location in sync with the organization's
// address so "near me" searches and map previews work. Best effort - the
// profile save itself never fails because of a geocoding problem.
async function syncOrganizationLocation(organization) {
  const addressLine = String(organization.address || '').trim()
  const city = String(organization.city || '').trim()
  const state = String(organization.state || '').trim()
  const pincode = String(organization.pincode || '').trim()

  // The Location schema requires the full address.
  if (!addressLine || !city || !state || !pincode) return

  try {
    const point = await geocodeAddress({ addressLine, city, state, pincode })

    let location = organization.location ? await Location.findById(organization.location) : null
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
      organization.location = location._id
      await organization.save()
    }
  } catch (error) {
    console.warn(`[organizations] Could not sync location for ${organization._id}: ${error.message}`)
  }
}

// GET /api/organizations
// Public directory: only APPROVED organizations are ever returned here.
// Supports ?city=, ?search=, ?page=, ?limit=
async function getPublicOrganizations(req, res) {
  const { city, search } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 12

  const filter = { verificationStatus: 'APPROVED' }

  if (city) {
    filter.city = city
  }
  if (search) {
    filter.organizationName = { $regex: escapeRegex(search), $options: 'i' }
  }

  const [total, organizations] = await Promise.all([
    Organization.countDocuments(filter),
    Organization.find(filter)
      .sort({ organizationName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        'organizationName organizationType description city address contactPerson phone verificationStatus'
      ),
  ])

  return success(res, 'Organizations fetched successfully', {
    organizations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// GET /api/organizations/:id
// Public detail of a single verified organization.
async function getOrganizationById(req, res) {
  const { id } = req.params

  const organization = await Organization.findOne({
    _id: id,
    verificationStatus: 'APPROVED',
  }).select(
    'organizationName organizationType description city state address contactPerson email phone verificationDetails.website verificationStatus createdAt'
  )

  if (!organization) {
    return failure(res, 'Organization not found', 404)
  }

  return success(res, 'Organization fetched successfully', { organization })
}

// ---------------------------------------------------------------------------
// Organization (owner) endpoints - /api/organizations/me...
// ---------------------------------------------------------------------------

// Loads the profile owned by the signed-in organization user, creating an
// empty PENDING one on first access so new accounts always have a profile.
async function getOrCreateOrganization(user) {
  const existing = await Organization.findOne({ user: user._id })
  if (existing) return existing

  try {
    return await Organization.create({
      user: user._id,
      organizationName: String(user.name || '').trim(),
      contactPerson: String(user.name || '').trim(),
      email: user.email || '',
      phone: user.phone || '',
      verificationStatus: 'PENDING',
    })
  } catch (error) {
    // Two parallel requests can both try to create the profile (unique user).
    if (error && error.code === 11000) {
      return Organization.findOne({ user: user._id })
    }
    throw error
  }
}

// GET /api/organizations/me
async function getMyOrganization(req, res) {
  const organization = await getOrCreateOrganization(req.user)
  await organization.populate('location')
  return success(res, 'Organization profile fetched successfully', { organization })
}

// PATCH /api/organizations/me - partial update; verificationStatus is admin-only.
async function updateMyOrganization(req, res) {
  const organization = await getOrCreateOrganization(req.user)

  const fields = [
    'organizationName',
    'organizationType',
    'description',
    'contactPerson',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'pincode',
  ]

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      organization[field] = String(req.body[field]).trim()
    }
  }

  if (req.body.registrationNumber !== undefined) {
    organization.verificationDetails.registrationNumber = String(
      req.body.registrationNumber
    ).trim()
  }
  if (req.body.website !== undefined) {
    organization.verificationDetails.website = String(req.body.website).trim()
  }
  if (req.body.establishedYear !== undefined) {
    organization.verificationDetails.establishedYear = req.body.establishedYear
      ? Number(req.body.establishedYear)
      : null
  }

  await organization.save()

  // Phase 12: re-geocode the address whenever the profile changes so the
  // organization stays findable via "near me" searches.
  await syncOrganizationLocation(organization)

  return success(res, 'Organization profile updated successfully', { organization })
}

// GET /api/organizations/me/stats - dashboard numbers for the organization.
async function getMyOrganizationStats(req, res) {
  const organization = await getOrCreateOrganization(req.user)
  const organizationId = new mongoose.Types.ObjectId(String(organization._id))

  const rows = await Donation.aggregate([
    { $match: { organization: organizationId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const byStatus = Object.fromEntries(DONATION_STATUSES.map((status) => [status, 0]))
  let total = 0
  for (const row of rows) {
    byStatus[row._id] = row.count
    total += row.count
  }

  // Total item quantity promised by donors (ignores cancelled/rejected requests).
  const itemRows = await DonationItem.aggregate([
    {
      $lookup: {
        from: Donation.collection.name,
        let: { donationId: '$donation' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$donationId'] },
              organization: organizationId,
              status: { $nin: IGNORED_ORGANIZATION_STATUSES },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: 'donationRef',
      },
    },
    { $unwind: '$donationRef' },
    { $group: { _id: null, totalItems: { $sum: '$quantity' } } },
  ])
  const totalItems = itemRows[0]?.totalItems || 0

  const recent = await Donation.find({ organization: organization._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('donor', DONOR_FIELDS)
    .populate('items', ITEM_FIELDS)

  return success(res, 'Organization statistics fetched successfully', {
    stats: {
      total,
      totalItems,
      byStatus,
      pending: byStatus.PENDING,
      active: byStatus.ACCEPTED + byStatus.SCHEDULED + byStatus.PICKED_UP,
      completed: byStatus.DISTRIBUTED,
      recent,
    },
  })
}

// GET /api/organizations/me/donations - requests addressed to this organization.
async function listMyDonations(req, res) {
  const organization = await getOrCreateOrganization(req.user)

  const { status } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = { organization: organization._id }
  if (status) filter.status = status

  const [total, donations] = await Promise.all([
    Donation.countDocuments(filter),
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('donor', DONOR_FIELDS)
      .populate('items', ITEM_FIELDS),
  ])

  return success(res, 'Donation requests fetched successfully', {
    donations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/organizations/me/donations/:id - one request owned by the org.
async function getMyDonation(req, res) {
  const organization = await getOrCreateOrganization(req.user)

  const donation = await Donation.findOne({
    _id: req.params.id,
    organization: organization._id,
  })
    .populate('donor', DONOR_FIELDS)
    .populate({ path: 'items', populate: { path: 'category', select: 'name' } })
    .populate('pickupLocation')

  if (!donation) {
    return failure(res, 'Donation not found', 404)
  }

  return success(res, 'Donation fetched successfully', { donation })
}

// PATCH /api/organizations/me/donations/:id/status - accept or reject a request.
async function updateMyDonationStatus(req, res) {
  const { status, rejectionReason } = req.body
  const organization = await getOrCreateOrganization(req.user)

  const donation = await Donation.findOne({
    _id: req.params.id,
    organization: organization._id,
  })
  if (!donation) {
    return failure(res, 'Donation not found', 404)
  }

  const allowed = ORGANIZATION_TRANSITIONS[donation.status] || []
  if (!allowed.includes(status)) {
    return failure(
      res,
      `A donation with status ${donation.status} cannot be moved to ${status}`,
      400
    )
  }

  donation.status = status
  if (status === 'REJECTED') {
    donation.rejectionReason = rejectionReason
      ? String(rejectionReason).trim()
      : 'Rejected by the organization'
  }
  await donation.save()

  const populated = await Donation.findById(donation._id)
    .populate('donor', DONOR_FIELDS)
    .populate('items', ITEM_FIELDS)

  // Phase 10: tell the donor what happened to their request.
  await createNotification({
    user: donation.donor,
    type: 'donation',
    title: status === 'ACCEPTED' ? 'Donation accepted' : 'Donation rejected',
    message:
      status === 'ACCEPTED'
        ? `${organization.organizationName} accepted your donation. You can now schedule a pickup.`
        : `${organization.organizationName} could not accept your donation${donation.rejectionReason ? `: ${donation.rejectionReason}` : '.'}`,
    relatedDonation: donation._id,
  })

  return success(res, `Donation ${status === 'ACCEPTED' ? 'accepted' : 'rejected'} successfully`, {
    donation: populated,
  })
}

module.exports = {
  getPublicOrganizations,
  getOrganizationById,
  getMyOrganization,
  updateMyOrganization,
  getMyOrganizationStats,
  listMyDonations,
  getMyDonation,
  updateMyDonationStatus,
};
