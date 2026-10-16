const express = require('express');
const validate = require('../middleware/validate');
const {
  getOverview,
  getDonationsReport,
  getCollectionsReport,
  getComplaintsReport,
  exportDonationsCsv,
  exportCollectionsCsv,
  exportComplaintsCsv,
} = require('../controllers/adminReportController');
const {
  reportDonationRules,
  reportCollectionRules,
  reportComplaintRules,
  exportDonationRules,
  exportCollectionRules,
  exportComplaintRules,
} = require('../validators/reportValidators');

// Mounted at /api/admin/reports by adminRoutes.js, which already runs
// protect + authorize('admin') for everything under /api/admin.
// So every route below is admin-only: 401 without a token, 403 for
// donor / organization accounts.
const router = express.Router();

// GET /api/admin/reports/overview - all counters in one call.
router.get('/overview', getOverview)

// GET /api/admin/reports/donations?status=&organization=&startDate=&endDate=&page=&limit=
router.get('/donations', reportDonationRules, validate, getDonationsReport)

// GET /api/admin/reports/collections?status=&startDate=&endDate=
router.get('/collections', reportCollectionRules, validate, getCollectionsReport)

// GET /api/admin/reports/complaints?status=&startDate=&endDate=
router.get('/complaints', reportComplaintRules, validate, getComplaintsReport)

// ---------- CSV exports (same filters, no pagination) ----------

// GET /api/admin/reports/export/donations
router.get('/export/donations', exportDonationRules, validate, exportDonationsCsv)

// GET /api/admin/reports/export/collections
router.get('/export/collections', exportCollectionRules, validate, exportCollectionsCsv)

// GET /api/admin/reports/export/complaints
router.get('/export/complaints', exportComplaintRules, validate, exportComplaintsCsv)

module.exports = router;
