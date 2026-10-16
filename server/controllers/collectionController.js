const CollectionRequest = require('../models/CollectionRequest');
const Donation = require('../models/Donation');
const Organization = require('../models/Organization');
const {
  COLLECTION_TRANSITIONS,
  DONATION_STAGES,
} = require('../utils/constants');
const { success, failure } = require('../utils/apiResponse');
const { createNotification, notifyUsers } = require('../services/notificationService');

const ORG_FIELDS = 'organizationName city organizationType';
const DONOR_FIELDS = 'name email phone';
const ITEM_FIELDS = 'category itemType quantity condition description';

// Phase 10: the donor and the receiving organization both care about pickups.
async function notifyPickupParties(donation, payload) {
  const organization = await Organization.findById(donation.organization).select('user')
  await notifyUsers([donation.donor, organization ? organization.user : null], payload)
}

// Filter that limits every query to what this user is allowed to see:
// - admin      -> everything
// - donor      -> their own donations/collections
// - organization -> donations assigned to their organization profile
async function scopeFilter(user) {
  if (user.role === 'admin') return {}
  if (user.role === 'donor') return { donor: user._id }

  const organization = await Organization.findOne({ user: user._id })
  return { organization: organization ? organization._id : null }
}

// Loads a donation the caller owns (donor) or receives (organization).
async function findDonation(user, donationId) {
  const scope = await scopeFilter(user)
  return Donation.findOne({ _id: donationId, ...scope })
}

// Loads a collection the caller is allowed to see.
async function findCollection(user, collectionId) {
  const scope = await scopeFilter(user)
  return CollectionRequest.findOne({ _id: collectionId, ...scope })
}

function populateCollection(query) {
  return query
    .populate('donor', DONOR_FIELDS)
    .populate('organization', ORG_FIELDS)
    .populate({
      path: 'donation',
      populate: [
        { path: 'items', select: ITEM_FIELDS },
        { path: 'organization', select: ORG_FIELDS },
      ],
    })
}

// POST /api/collections - schedule the pickup of an accepted donation.
async function scheduleCollection(req, res) {
  const { donation: donationId, scheduledDate, scheduledTime, address, notes } = req.body

  const donation = await findDonation(req.user, donationId)
  if (!donation) {
    return failure(res, 'Donation not found', 404)
  }

  // Rejected and cancelled donations are terminal - never schedulable.
  if (donation.status === 'CANCELLED' || donation.status === 'REJECTED') {
    const label = donation.status === 'CANCELLED' ? 'cancelled' : 'rejected'
    return failure(res, `A ${label} donation cannot be scheduled`, 400)
  }

  // Only a donation the organization has accepted can get a pickup.
  if (donation.status !== 'ACCEPTED') {
    return failure(
      res,
      `Only accepted donations can be scheduled (current status: ${donation.status})`,
      400
    )
  }

  const existing = await CollectionRequest.findOne({ donation: donation._id })
  if (existing) {
    return failure(res, 'A collection is already scheduled for this donation', 400)
  }

  const pickupDate = new Date(scheduledDate)
  const pickupTime = String(scheduledTime).trim()
  const pickupAddress = address ? String(address).trim() : donation.pickupAddress

  // Keep the donation in sync so the donor's history shows the pickup too.
  donation.scheduledDate = pickupDate
  donation.scheduledTime = pickupTime
  donation.pickupAddress = pickupAddress
  donation.status = 'SCHEDULED'
  await donation.save() // pre-save hook appends the statusHistory entry

  const collection = await CollectionRequest.create({
    donation: donation._id,
    donor: donation.donor,
    organization: donation.organization,
    address: pickupAddress,
    scheduledDate: pickupDate,
    scheduledTime: pickupTime,
    notes: notes ? String(notes).trim() : '',
    status: 'SCHEDULED',
  })

  // Phase 10: both parties get the pickup slot in their notifications.
  await notifyPickupParties(donation, {
    type: 'collection',
    title: 'Pickup scheduled',
    message: `Pickup scheduled for ${pickupDate.toDateString()}, ${pickupTime}.`,
    relatedDonation: donation._id,
  })

  const populated = await populateCollection(CollectionRequest.findById(collection._id))

  return success(res, 'Collection scheduled successfully', { collection: populated, donation }, 201)
}

// GET /api/collections - the caller's collections (status/donation filters).
async function listCollections(req, res) {
  const { status, donation } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const scope = await scopeFilter(req.user)
  const filter = { ...scope }
  if (status) filter.status = status
  if (donation) filter.donation = donation

  const [total, collections] = await Promise.all([
    CollectionRequest.countDocuments(filter),
    populateCollection(
      CollectionRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ),
  ])

  return success(res, 'Collections fetched successfully', {
    collections,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/collections/:id - one collection with its donation.
async function getCollection(req, res) {
  const collection = await findCollection(req.user, req.params.id)
  if (!collection) {
    return failure(res, 'Collection not found', 404)
  }

  const populated = await populateCollection(CollectionRequest.findById(collection._id))

  return success(res, 'Collection fetched successfully', { collection: populated })
}

// GET /api/collections/:id/tracking - status timeline for the donation.
async function getTracking(req, res) {
  const collection = await findCollection(req.user, req.params.id)
  if (!collection) {
    return failure(res, 'Collection not found', 404)
  }

  const donation = await Donation.findById(collection.donation)
    .select('status statusHistory pickupAddress scheduledDate scheduledTime createdAt updatedAt')

  return success(res, 'Tracking information fetched successfully', {
    collection,
    donation,
    tracking: {
      stages: DONATION_STAGES,
      currentStatus: donation.status,
      currentStageIndex: DONATION_STAGES.indexOf(donation.status),
      history: donation.statusHistory,
      lastUpdated: donation.updatedAt,
      isTerminal: donation.status === 'CANCELLED' || donation.status === 'REJECTED',
    },
  })
}

// PATCH /api/collections/:id - change date/time/address while still SCHEDULED.
async function rescheduleCollection(req, res) {
  const collection = await findCollection(req.user, req.params.id)
  if (!collection) {
    return failure(res, 'Collection not found', 404)
  }

  if (collection.status !== 'SCHEDULED') {
    return failure(
      res,
      `Only a scheduled collection can be rescheduled (current status: ${collection.status})`,
      400
    )
  }

  const pickupDate = new Date(req.body.scheduledDate)
  const pickupTime = String(req.body.scheduledTime).trim()

  collection.scheduledDate = pickupDate
  collection.scheduledTime = pickupTime
  if (req.body.address) collection.address = String(req.body.address).trim()
  if (req.body.notes !== undefined) collection.notes = String(req.body.notes).trim()

  const donation = await Donation.findById(collection.donation)
  if (donation) {
    donation.scheduledDate = pickupDate
    donation.scheduledTime = pickupTime
    if (collection.address) donation.pickupAddress = collection.address
    await donation.save()
  }

  await collection.save()

  // Phase 10: the pickup slot changed - tell both parties again.
  if (donation) {
    await notifyPickupParties(donation, {
      type: 'collection',
      title: 'Pickup rescheduled',
      message: `Pickup moved to ${pickupDate.toDateString()}, ${pickupTime}.`,
      relatedDonation: donation._id,
    })
  }

  const populated = await populateCollection(CollectionRequest.findById(collection._id))

  return success(res, 'Collection rescheduled successfully', { collection: populated })
}

// PATCH /api/collections/:id/status - organization moves the pickup forward.
async function updateCollectionStatus(req, res) {
  const { status } = req.body

  const collection = await findCollection(req.user, req.params.id)
  if (!collection) {
    return failure(res, 'Collection not found', 404)
  }

  const allowed = COLLECTION_TRANSITIONS[collection.status] || []
  if (!allowed.includes(status)) {
    return failure(
      res,
      `A collection with status ${collection.status} cannot be moved to ${status}`,
      400
    )
  }

  const donation = await Donation.findById(collection.donation)
  if (!donation || donation.status === 'CANCELLED' || donation.status === 'REJECTED') {
    return failure(res, 'This donation is no longer active', 400)
  }

  collection.status = status
  await collection.save()

  // The donation mirrors the collection so both timelines stay identical.
  donation.status = status
  await donation.save()

  // Phase 10: keep the donor posted as the pickup moves forward.
  const DONOR_UPDATES = {
    PICKED_UP: 'Your items have been picked up.',
    RECEIVED: 'The organization confirmed it has your items.',
    DISTRIBUTED: 'Your items have been distributed. Thank you for donating!',
  }
  await createNotification({
    user: donation.donor,
    type: 'collection',
    title: `Donation ${status.replace('_', ' ').toLowerCase()}`,
    message: DONOR_UPDATES[status] || `Your donation is now ${status}.`,
    relatedDonation: donation._id,
  })

  const populated = await populateCollection(CollectionRequest.findById(collection._id))

  return success(res, 'Collection status updated successfully', {
    collection: populated,
    donation,
  })
}

module.exports = {
  scheduleCollection,
  listCollections,
  getCollection,
  getTracking,
  rescheduleCollection,
  updateCollectionStatus,
};
