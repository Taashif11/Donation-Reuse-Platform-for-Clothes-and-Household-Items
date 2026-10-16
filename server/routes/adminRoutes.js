const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getStats,
  listUsers,
  updateUserStatus,
  listOrganizations,
  getOrganization,
  verifyOrganization,
  listDonations,
} = require('../controllers/adminController');
const {
  listUserRules,
  userStatusRules,
  listOrganizationRules,
  organizationIdRules,
  verifyOrganizationRules,
  listAdminDonationRules,
} = require('../validators/adminValidators');
const {
  adminListComplaints,
  adminGetComplaint,
  adminUpdateComplaintStatus,
} = require('../controllers/complaintController');
const {
  listComplaintRules,
  complaintIdRules,
  adminUpdateStatusRules,
} = require('../validators/complaintValidators');

const router = express.Router();

// Everything under /api/admin is admin-only. No exceptions.
router.use(protect, authorize('admin'))

// GET /api/admin/stats - dashboard counters
router.get('/stats', getStats)

// GET /api/admin/users?role=&status=&q=&page=&limit=
router.get('/users', listUserRules, validate, listUsers)

// PATCH /api/admin/users/:id/status  { isActive: true | false }
router.patch('/users/:id/status', userStatusRules, validate, updateUserStatus)

// GET /api/admin/organizations?verificationStatus=&q=&page=&limit=
router.get('/organizations', listOrganizationRules, validate, listOrganizations)

// GET /api/admin/organizations/:id
router.get('/organizations/:id', organizationIdRules, validate, getOrganization)

// PATCH /api/admin/organizations/:id/verify  { verificationStatus, verificationNotes }
router.patch('/organizations/:id/verify', verifyOrganizationRules, validate, verifyOrganization)

// GET /api/admin/donations?status=&page=&limit=  (read-only)
router.get('/donations', listAdminDonationRules, validate, listDonations)

// ---------- Complaints (Phase 10) ----------

// GET /api/admin/complaints?status=&q=&page=&limit=  (the admin work queue)
router.get('/complaints', listComplaintRules, validate, adminListComplaints)

// GET /api/admin/complaints/:id
router.get('/complaints/:id', complaintIdRules, validate, adminGetComplaint)

// PATCH /api/admin/complaints/:id/status  { status, adminResponse }
router.patch('/complaints/:id/status', adminUpdateStatusRules, validate, adminUpdateComplaintStatus)

// ---------- Reports & exports (Phase 11) ----------
// Mounted after the protect + authorize('admin') line above, so all
// /api/admin/reports/* endpoints are admin-only (401 without a token,
// 403 for donor / organization accounts).
router.use('/reports', require('./adminReportRoutes'))

module.exports = router;
