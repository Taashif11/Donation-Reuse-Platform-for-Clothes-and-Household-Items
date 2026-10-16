const User = require('../models/User');
const Organization = require('../models/Organization');
const Donation = require('../models/Donation');
const CollectionRequest = require('../models/CollectionRequest');
const { DONATION_STATUSES } = require('../utils/constants');
const { toSafeUser } = require('../utils/safeUser');
const { createNotification } = require('../services/notificationService');
const { success, failure } = require('../utils/apiResponse');

const ORG_FIELDS = 'organizationName city organizationType verificationStatus createdAt';
const ITEM_FIELDS = 'category itemType quantity condition description image';
const ACTIVE_DONATION_STATUSES = ['ACCEPTED', 'SCHEDULED', 'PICKED_UP'];

// Turns a free text search term into a safe regular expression.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/admin/stats - simple platform-wide counters for the dashboard.
async function getStats(req, res) {
  const [usersByRole, inactiveUsers, orgsByStatus, donationRows, totalUsers, totalOrgs, totalCollections, recentDonations, recentUsers] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.countDocuments({ isActive: false }),
      Organization.aggregate([{ $group: { _id: '$verificationStatus', count: { $sum: 1 } } }]),
      Donation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments(),
      Organization.countDocuments(),
      CollectionRequest.countDocuments(),
      Donation.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('donor', 'name email')
        .populate('organization', 'organizationName city'),
      User.find().sort({ createdAt: -1 }).limit(5),
    ])

  const usersByRoleMap = Object.fromEntries(usersByRole.map((row) => [row._id, row.count]))
  const orgsByStatusMap = Object.fromEntries(orgsByStatus.map((row) => [row._id, row.count]))
  const byStatus = Object.fromEntries(DONATION_STATUSES.map((status) => [status, 0]))
  let totalDonations = 0
  for (const row of donationRows) {
    if (byStatus[row._id] !== undefined) byStatus[row._id] = row.count
    totalDonations += row.count
  }

  const active = ACTIVE_DONATION_STATUSES.reduce((sum, status) => sum + (byStatus[status] || 0), 0)

  return success(res, 'Platform statistics fetched successfully', {
    stats: {
      users: {
        total: totalUsers,
        active: totalUsers - inactiveUsers,
        inactive: inactiveUsers,
        byRole: usersByRoleMap,
      },
      organizations: {
        total: totalOrgs,
        pending: orgsByStatusMap.PENDING || 0,
        byStatus: orgsByStatusMap,
      },
      donations: {
        total: totalDonations,
        active,
        distributed: byStatus.DISTRIBUTED || 0,
        byStatus,
      },
      collections: { total: totalCollections },
      recentDonations,
      recentUsers,
    },
  })
}

// GET /api/admin/users - all accounts with role/status filters and search.
async function listUsers(req, res) {
  const { role, status, q } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = {}
  if (role) filter.role = role
  // Users created before Phase 9 have no isActive field - treat them as active.
  if (status === 'active') filter.isActive = { $ne: false }
  if (status === 'inactive') filter.isActive = false
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: regex }, { email: regex }]
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  return success(res, 'Users fetched successfully', {
    users: users.map(toSafeUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// PATCH /api/admin/users/:id/status - activate or deactivate an account.
async function updateUserStatus(req, res) {
  const { isActive } = req.body

  const user = await User.findById(req.params.id)
  if (!user) {
    return failure(res, 'User not found', 404)
  }

  // An admin may not lock themselves out of the platform.
  if (String(user._id) === String(req.user._id) && isActive === false) {
    return failure(res, 'You cannot deactivate your own account', 400)
  }

  user.isActive = isActive
  await user.save()

  return success(res, isActive ? 'Account activated successfully' : 'Account deactivated successfully', {
    user: toSafeUser(user),
  })
}

// GET /api/admin/organizations - verification queue + full directory.
async function listOrganizations(req, res) {
  const { verificationStatus, q } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = {}
  if (verificationStatus) filter.verificationStatus = verificationStatus
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ organizationName: regex }, { city: regex }]
  }

  const [total, organizations] = await Promise.all([
    Organization.countDocuments(filter),
    Organization.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email phone isActive'),
  ])

  return success(res, 'Organizations fetched successfully', {
    organizations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

// GET /api/admin/organizations/:id - full profile for the verification screen.
async function getOrganization(req, res) {
  const organization = await Organization.findById(req.params.id)
    .populate('user', 'name email phone role isActive createdAt')
    .populate('verifiedBy', 'name email')

  if (!organization) {
    return failure(res, 'Organization not found', 404)
  }

  return success(res, 'Organization fetched successfully', { organization })
}

// PATCH /api/admin/organizations/:id/verify - approve / reject / ask for more info.
async function verifyOrganization(req, res) {
  const { verificationStatus } = req.body
  const notes = req.body.verificationNotes

  const organization = await Organization.findById(req.params.id)
  if (!organization) {
    return failure(res, 'Organization not found', 404)
  }

  // An admin cannot verify an organization they own.
  if (String(organization.user) === String(req.user._id)) {
    return failure(res, 'You cannot verify your own organization', 400)
  }

  // APPROVED and REJECTED are final - only PENDING / NEEDS_MORE_INFO can be decided.
  if (!['PENDING', 'NEEDS_MORE_INFO'].includes(organization.verificationStatus)) {
    return failure(
      res,
      `An organization with status ${organization.verificationStatus} has already been verified`,
      400
    )
  }

  organization.verificationStatus = verificationStatus
  if (notes !== undefined) organization.verificationNotes = String(notes).trim()
  organization.verifiedBy = req.user._id
  organization.verifiedAt = new Date()
  await organization.save()

  const populated = await Organization.findById(organization._id)
    .populate('user', 'name email phone role isActive createdAt')
    .populate('verifiedBy', 'name email')

  // Phase 10: the organization account learns its verification outcome.
  const VERIFICATION_MESSAGES = {
    APPROVED: 'Your organization has been approved. It now appears in the public directory.',
    REJECTED: `Your organization verification was rejected${notes ? `: ${notes}` : '.'}`,
    NEEDS_MORE_INFO: `More information is needed to verify your organization${notes ? `: ${notes}` : '.'}`,
  }
  await createNotification({
    user: organization.user,
    type: 'verification',
    title: `Verification ${verificationStatus.replace('_', ' ').toLowerCase()}`,
    message: VERIFICATION_MESSAGES[verificationStatus] || 'Your verification status changed.',
  })

  return success(res, 'Organization verification updated successfully', { organization: populated })
}

// GET /api/admin/donations - read-only view across every donor.
async function listDonations(req, res) {
  const { status } = req.query
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const filter = {}
  if (status) filter.status = status

  const [total, donations] = await Promise.all([
    Donation.countDocuments(filter),
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('donor', 'name email')
      .populate('organization', 'organizationName city')
      .populate('items', ITEM_FIELDS),
  ])

  return success(res, 'Donations fetched successfully', {
    donations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

module.exports = {
  getStats,
  listUsers,
  updateUserStatus,
  listOrganizations,
  getOrganization,
  verifyOrganization,
  listDonations,
};
