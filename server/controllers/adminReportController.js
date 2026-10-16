const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Donation = require('../models/Donation');
const DonationItem = require('../models/DonationItem');
const CollectionRequest = require('../models/CollectionRequest');
const Complaint = require('../models/Complaint');
const {
  DONATION_STATUSES,
  COLLECTION_STATUSES,
  COMPLAINT_STATUSES,
} = require('../utils/constants');
const { success } = require('../utils/apiResponse');
const { sendCsv } = require('../utils/csv');

// ---------------------------------------------------------------------------
// Phase 11 - admin reports and CSV exports.
// Every handler is mounted behind protect + authorize('admin') in adminRoutes,
// so these are admin-only and reuse the models from Phases 3-10 as they are.
// ---------------------------------------------------------------------------

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// Builds a safe { createdAt: { $gte, $lte } } range from the validated query.
// Only these two whitelisted strings are ever turned into a MongoDB condition.
// A date-only endDate ("2026-10-05") includes the whole day.
function dateRangeFilter({ startDate, endDate }) {
  const filter = {}

  if (startDate) {
    filter.$gte = new Date(startDate)
  }

  if (endDate) {
    filter.$lte = DATE_ONLY.test(endDate)
      ? new Date(`${endDate}T23:59:59.999Z`)
      : new Date(endDate)
  }

  return Object.keys(filter).length ? { createdAt: filter } : {}
}

// Applies status + date (+ optional organization) to the request query.
// The organization id is cast to an ObjectId because .aggregate() does not
// auto-cast strings the way .find() does (the validator already proved it
// is a valid id before this runs).
function donationFilter(query) {
  const filter = {}
  if (query.status) filter.status = query.status
  if (query.organization) filter.organization = new mongoose.Types.ObjectId(query.organization)
  return Object.assign(filter, dateRangeFilter(query))
}

function statusFilter(query) {
  const filter = {}
  if (query.status) filter.status = query.status
  return Object.assign(filter, dateRangeFilter(query))
}

// [{ _id: 'PENDING', count: 2 }, ...] -> { PENDING: 2, ... } with no gaps.
function toCountMap(rows, statuses) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]))
  for (const row of rows) {
    if (row._id) counts[row._id] = row.count
  }
  return counts
}

// Sums every value of a { STATUS: count } map (the report "total" line).
function sumCounts(counts) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

function countByStatus(Model, filter) {
  const pipeline = []
  if (Object.keys(filter).length) pipeline.push({ $match: filter })
  pipeline.push({ $group: { _id: '$status', count: { $sum: 1 } } })
  return Model.aggregate(pipeline)
}

// Donation totals incl. "how many items were donated" (sum of item quantities).
// One aggregation with a $lookup keeps it a single round trip.
function donationTotals(filter) {
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: DonationItem.collection.name,
        localField: 'items',
        foreignField: '_id',
        as: 'itemDocs',
      },
    },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalItems: { $sum: { $sum: '$itemDocs.quantity' } },
        totalItemRows: { $sum: { $size: '$itemDocs' } },
      },
    },
  ]

  return Donation.aggregate(pipeline).then(([row]) => ({
    totalDonations: row ? row.totalDonations : 0,
    totalItems: row ? row.totalItems : 0,
    totalItemRows: row ? row.totalItemRows : 0,
  }))
}

// Monthly buckets such as [{ period: '2026-09', count: 3 }] - used for the
// "activity over time" line of the collection and complaint reports.
function monthlyActivity(Model, filter) {
  const pipeline = []
  if (Object.keys(filter).length) pipeline.push({ $match: filter })
  pipeline.push(
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  )

  return Model.aggregate(pipeline).then((rows) =>
    rows.map((row) => ({ period: row._id, count: row.count }))
  )
}

// GET /api/admin/reports/overview - one call with every platform counter the
// reports page needs (donations, collections, complaints, organizations, users).
async function getOverview(req, res) {
  const [
    usersByRole,
    inactiveUsers,
    totalUsers,
    orgsByStatus,
    totalOrgs,
    donationStatusRows,
    donationSummary,
    collectionStatusRows,
    complaintStatusRows,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: false }),
    User.countDocuments(),
    Organization.aggregate([{ $group: { _id: '$verificationStatus', count: { $sum: 1 } } }]),
    Organization.countDocuments(),
    countByStatus(Donation, {}),
    donationTotals({}),
    countByStatus(CollectionRequest, {}),
    countByStatus(Complaint, {}),
  ])

  const donationByStatus = toCountMap(donationStatusRows, DONATION_STATUSES)
  const collectionByStatus = toCountMap(collectionStatusRows, COLLECTION_STATUSES)
  const complaintByStatus = toCountMap(complaintStatusRows, COMPLAINT_STATUSES)
  const orgByStatus = Object.fromEntries(
    ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO'].map((status) => [status, 0])
  )
  for (const row of orgsByStatus) {
    if (orgByStatus[row._id] !== undefined) orgByStatus[row._id] = row.count
  }
  const roleCounts = Object.fromEntries(
    ['donor', 'organization', 'admin'].map((role) => [role, 0])
  )
  for (const row of usersByRole) {
    if (roleCounts[row._id] !== undefined) roleCounts[row._id] = row.count
  }

  return success(res, 'Report overview fetched successfully', {
    donations: {
      total: donationSummary.totalDonations,
      totalItems: donationSummary.totalItems,
      byStatus: donationByStatus,
    },
    collections: {
      total: sumCounts(collectionByStatus),
      completed: collectionByStatus.DISTRIBUTED,
      pending: collectionByStatus.SCHEDULED,
      byStatus: collectionByStatus,
    },
    complaints: {
      total: sumCounts(complaintByStatus),
      open: complaintByStatus.OPEN,
      inReview: complaintByStatus.IN_REVIEW,
      resolved: complaintByStatus.RESOLVED,
      closed: complaintByStatus.CLOSED,
      byStatus: complaintByStatus,
    },
    organizations: {
      total: totalOrgs,
      approved: orgByStatus.APPROVED,
      pending: orgByStatus.PENDING,
      rejected: orgByStatus.REJECTED,
      needsMoreInfo: orgByStatus.NEEDS_MORE_INFO,
      byStatus: orgByStatus,
    },
    users: {
      total: totalUsers,
      active: totalUsers - inactiveUsers,
      inactive: inactiveUsers,
      byRole: roleCounts,
    },
  })
}

// GET /api/admin/reports/donations?status=&organization=&startDate=&endDate=&page=&limit=
async function getDonationsReport(req, res) {
  const filter = donationFilter(req.query)
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const [summary, statusRows, donations] = await Promise.all([
    donationTotals(filter),
    countByStatus(Donation, filter),
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('donor', 'name email')
      .populate('organization', 'organizationName city')
      .populate('items', 'itemType quantity condition'),
  ])

  const byStatus = toCountMap(statusRows, DONATION_STATUSES)

  return success(res, 'Donation report fetched successfully', {
    summary: {
      totalDonations: summary.totalDonations,
      totalItems: summary.totalItems,
      totalItemRows: summary.totalItemRows,
      byStatus,
    },
    donations,
    pagination: {
      page,
      limit,
      total: summary.totalDonations,
      totalPages: Math.ceil(summary.totalDonations / limit),
    },
  })
}

// GET /api/admin/reports/collections?status=&startDate=&endDate=
async function getCollectionsReport(req, res) {
  const filter = statusFilter(req.query)

  const [statusRows, activity] = await Promise.all([
    countByStatus(CollectionRequest, filter),
    monthlyActivity(CollectionRequest, filter),
  ])

  const byStatus = toCountMap(statusRows, COLLECTION_STATUSES)

  return success(res, 'Collection report fetched successfully', {
    summary: {
      total: sumCounts(byStatus),
      completed: byStatus.DISTRIBUTED,
      pending: byStatus.SCHEDULED,
      cancelled: byStatus.CANCELLED,
      byStatus,
    },
    activity,
  })
}

// GET /api/admin/reports/complaints?status=&startDate=&endDate=
async function getComplaintsReport(req, res) {
  const filter = statusFilter(req.query)

  const [statusRows, activity] = await Promise.all([
    countByStatus(Complaint, filter),
    monthlyActivity(Complaint, filter),
  ])

  const byStatus = toCountMap(statusRows, COMPLAINT_STATUSES)

  return success(res, 'Complaint report fetched successfully', {
    summary: {
      total: sumCounts(byStatus),
      open: byStatus.OPEN,
      inReview: byStatus.IN_REVIEW,
      resolved: byStatus.RESOLVED,
      closed: byStatus.CLOSED,
      byStatus,
    },
    activity,
  })
}

// ---------------------------------------------------------------------------
// CSV exports - same filters as the reports, returned as a file download.
// ---------------------------------------------------------------------------

function today() {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/admin/reports/export/donations
async function exportDonationsCsv(req, res) {
  const filter = donationFilter(req.query)

  const donations = await Donation.find(filter)
    .sort({ createdAt: -1 })
    .populate('donor', 'name email')
    .populate('organization', 'organizationName city')
    .populate('items', 'quantity')

  const rows = donations.map((donation) => [
    donation._id,
    donation.createdAt,
    donation.status,
    donation.donor ? donation.donor.name : '',
    donation.donor ? donation.donor.email : '',
    donation.organization ? donation.organization.organizationName : '',
    donation.organization ? donation.organization.city : '',
    donation.items.length,
    donation.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    donation.pickupAddress,
    donation.scheduledDate || '',
    donation.scheduledTime || '',
  ])

  return sendCsv(
    res,
    `donations-report-${today()}.csv`,
    [
      'Donation ID',
      'Created At',
      'Status',
      'Donor Name',
      'Donor Email',
      'Organization',
      'City',
      'Item Rows',
      'Total Quantity',
      'Pickup Address',
      'Scheduled Date',
      'Scheduled Time',
    ],
    rows
  )
}

// GET /api/admin/reports/export/collections
async function exportCollectionsCsv(req, res) {
  const filter = statusFilter(req.query)

  const collections = await CollectionRequest.find(filter)
    .sort({ createdAt: -1 })
    .populate('donor', 'name email')
    .populate('organization', 'organizationName city')
    .populate('donation', 'status')

  const rows = collections.map((collection) => [
    collection._id,
    collection.createdAt,
    collection.status,
    collection.donation ? collection.donation._id : '',
    collection.donor ? collection.donor.name : '',
    collection.donor ? collection.donor.email : '',
    collection.organization ? collection.organization.organizationName : '',
    collection.organization ? collection.organization.city : '',
    collection.address,
    collection.scheduledDate,
    collection.scheduledTime,
    collection.notes || '',
  ])

  return sendCsv(
    res,
    `collections-report-${today()}.csv`,
    [
      'Collection ID',
      'Created At',
      'Status',
      'Donation ID',
      'Donor Name',
      'Donor Email',
      'Organization',
      'City',
      'Address',
      'Scheduled Date',
      'Scheduled Time',
      'Notes',
    ],
    rows
  )
}

// GET /api/admin/reports/export/complaints
async function exportComplaintsCsv(req, res) {
  const filter = statusFilter(req.query)

  const complaints = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .populate('user', 'name email role')
    .populate('donation', 'status')
    .populate('respondedBy', 'name email')

  const rows = complaints.map((complaint) => [
    complaint._id,
    complaint.createdAt,
    complaint.status,
    complaint.subject,
    complaint.user ? complaint.user.name : '',
    complaint.user ? complaint.user.email : '',
    complaint.user ? complaint.user.role : '',
    complaint.donation ? complaint.donation._id : '',
    complaint.respondedBy ? complaint.respondedBy.name : '',
    complaint.adminResponse || '',
    complaint.updatedAt,
  ])

  return sendCsv(
    res,
    `complaints-report-${today()}.csv`,
    [
      'Complaint ID',
      'Created At',
      'Status',
      'Subject',
      'Raised By',
      'Email',
      'Role',
      'Donation ID',
      'Responded By',
      'Admin Response',
      'Updated At',
    ],
    rows
  )
}

module.exports = {
  getOverview,
  getDonationsReport,
  getCollectionsReport,
  getComplaintsReport,
  exportDonationsCsv,
  exportCollectionsCsv,
  exportComplaintsCsv,
};
