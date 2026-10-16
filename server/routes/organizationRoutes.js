const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getPublicOrganizations,
  getOrganizationById,
  getMyOrganization,
  updateMyOrganization,
  getMyOrganizationStats,
  listMyDonations,
  getMyDonation,
  updateMyDonationStatus,
} = require('../controllers/organizationController');
const {
  listPublicRules,
  organizationIdRules,
  updateOrganizationRules,
  listOrganizationDonationRules,
  organizationDonationIdRules,
  updateOrganizationStatusRules,
} = require('../validators/organizationValidators');
const validate = require('../middleware/validate');

const router = express.Router();

// ---------- Owner endpoints (/me) ----------
// Registered before "/:id" so "me" is never treated as an organization id,
// and so a donor/admin token gets 403 instead of hitting the public routes.
router.use('/me', protect, authorize('organization'))

// GET /api/organizations/me
router.get('/me', getMyOrganization)

// PATCH /api/organizations/me
router.patch('/me', updateOrganizationRules, validate, updateMyOrganization)

// GET /api/organizations/me/stats
router.get('/me/stats', getMyOrganizationStats)

// GET /api/organizations/me/donations  (?status=&page=&limit=)
router.get('/me/donations', listOrganizationDonationRules, validate, listMyDonations)

// GET /api/organizations/me/donations/:id
router.get('/me/donations/:id', organizationDonationIdRules, validate, getMyDonation)

// PATCH /api/organizations/me/donations/:id/status
router.patch(
  '/me/donations/:id/status',
  updateOrganizationStatusRules,
  validate,
  updateMyDonationStatus
)

// ---------- Public directory (verified organizations only) ----------

// GET /api/organizations  (?city=&search=&page=&limit=)
router.get('/', listPublicRules, validate, getPublicOrganizations)

// GET /api/organizations/:id
router.get('/:id', organizationIdRules, validate, getOrganizationById)

module.exports = router;
