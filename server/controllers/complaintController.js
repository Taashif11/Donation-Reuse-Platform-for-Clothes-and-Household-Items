const Complaint = require('../models/Complaint');
const Donation = require('../models/Donation');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { COMPLAINT_TRANSITIONS } = require('../utils/constants');
const { createNotification, notifyUsers } = require('../services/notificationService');
const { success, failure } = require('../utils/apiResponse');

const USER_FIELDS = 'name email role';
const DONATION_FIELDS = 'status pickupAddress scheduledDate scheduledTime createdAt';

// Turns a free text search term into a safe regular expression.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Loads a complaint the caller may see: admin sees everything, everyone else
// only their own. Anything out of scope returns 404 (no existence leak).
// Returns the query (not a promise) so callers can chain .populate().
function findComplaint(user, complaintId) {
  const filter = user.role === 'admin' ? {} : { user: user._id }
  return Complaint.findOne({ _id: complaintId, ...filter })
}

// ---------------------------------------------------------------------------
// /api/complaints - donor / organization / admin
// ---------------------------------------------------------------------------

// POST /api/complaints - raise a complaint (optionally linked to a donation).
async function createComplaint(req, res) {
  const { subject, description, donation: donationId } = req.body

  let donation = null
  if (donationId) {
    if (req.user.role === 'admin') {
      return failure(res, 'Donation link is not allowed on this account', 400)
    }

    if (req.user.role === 'donor') {
      donation = await Donation.findOne({ _id: donationId, donor: req.user._id })
    } else {
      const organization = await Organization.findOne({ user: req.user._id })
      donation = organization
        ? await Donation.findOne({ _id: donationId, organization: organization._id })
        : null
    }

    if (!donation) {
      return failure(res, 'Donation not found', 404)
    }
  }

  const complaint = await Complaint.create({
    user: req.user._id,
    donation: donation ? donation._id : null,
    subject: String(subject).trim(),
    description: String(description).trim(),
    status: 'OPEN',
  })

  // Let every admin know a new complaint entered the queue.
  const admins = await User.find({ role: 'admin' }).select('_id')
  await notifyUsers(
    admins.map((admin) => admin._id),
    {
      type: 'complaint',
      title: 'New complaint received',
      message: `${req.user.name} raised a complaint: ${complaint.subject}`,
      relatedDonation: complaint.donation,
    }
  )

  const populated = await Complaint.findById(complaint._id)
    .populate('user', USER_FIELDS)
    .populate('donation', DONATION_FIELDS)

  return success(res, 'Complaint submitted successfully', { complaint: populated }, 201)
}

// GET /api/complaints - own complaints (admin sees every complaint here too).
async function listComplaints(req, res) {
  const { status } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = {}
  if (req.user.role !== 'admin') filter.user = req.user._id
  if (status) filter.status = status

  const [total, complaints] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', USER_FIELDS)
      .populate('donation', DONATION_FIELDS)
      .populate('respondedBy', USER_FIELDS),
  ])

  return success(res, 'Complaints fetched successfully', {
    complaints,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/complaints/:id - owner or admin only.
async function getComplaint(req, res) {
  const complaint = await findComplaint(req.user, req.params.id)
    .populate('user', USER_FIELDS)
    .populate('donation', DONATION_FIELDS)
    .populate('respondedBy', USER_FIELDS)

  if (!complaint) {
    return failure(res, 'Complaint not found', 404)
  }

  return success(res, 'Complaint fetched successfully', { complaint })
}

// ---------------------------------------------------------------------------
// /api/admin/complaints - admin only (mounted behind authorize('admin'))
// ---------------------------------------------------------------------------

// GET /api/admin/complaints - the work queue: status filter + search + paging.
async function adminListComplaints(req, res) {
  const { status, q } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = {}
  if (status) filter.status = status
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ subject: regex }, { description: regex }]
  }

  const [total, complaints] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', `${USER_FIELDS} phone`)
      .populate('donation', DONATION_FIELDS)
      .populate('respondedBy', USER_FIELDS),
  ])

  return success(res, 'Complaints fetched successfully', {
    complaints,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/admin/complaints/:id - full detail for the response screen.
async function adminGetComplaint(req, res) {
  const complaint = await Complaint.findById(req.params.id)
    .populate('user', `${USER_FIELDS} phone`)
    .populate('donation', DONATION_FIELDS)
    .populate('respondedBy', USER_FIELDS)

  if (!complaint) {
    return failure(res, 'Complaint not found', 404)
  }

  return success(res, 'Complaint fetched successfully', { complaint })
}

// PATCH /api/admin/complaints/:id/status - move through the workflow.
async function adminUpdateComplaintStatus(req, res) {
  const { status } = req.body
  const responseText =
    req.body.adminResponse !== undefined ? String(req.body.adminResponse).trim() : ''

  const complaint = await Complaint.findById(req.params.id)
  if (!complaint) {
    return failure(res, 'Complaint not found', 404)
  }

  const allowed = COMPLAINT_TRANSITIONS[complaint.status] || []
  if (!allowed.includes(status)) {
    return failure(
      res,
      `A complaint with status ${complaint.status} cannot be moved to ${status}`,
      400
    )
  }

  // Resolving without telling the user why makes no sense - require a response.
  if (status === 'RESOLVED' && responseText.length < 5) {
    return failure(res, 'An admin response is required to resolve a complaint', 400)
  }

  complaint.status = status
  if (responseText) complaint.adminResponse = responseText
  complaint.respondedBy = req.user._id
  await complaint.save()

  // Tell the complainant what happened (in-app only).
  await createNotification({
    user: complaint.user,
    type: 'complaint',
    title: `Complaint ${status.replace('_', ' ').toLowerCase()}`,
    message: `Your complaint "${complaint.subject}" is now ${status.replace('_', ' ')}.${
      responseText ? ` Admin response: ${responseText}` : ''
    }`,
    relatedDonation: complaint.donation,
  })

  const populated = await Complaint.findById(complaint._id)
    .populate('user', USER_FIELDS)
    .populate('donation', DONATION_FIELDS)
    .populate('respondedBy', USER_FIELDS)

  return success(res, 'Complaint status updated successfully', { complaint: populated })
}

module.exports = {
  createComplaint,
  listComplaints,
  getComplaint,
  adminListComplaints,
  adminGetComplaint,
  adminUpdateComplaintStatus,
};
