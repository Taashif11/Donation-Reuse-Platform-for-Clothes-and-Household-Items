const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createDonation,
  listDonations,
  getDonationStats,
  getDonation,
  updateDonationStatus,
} = require('../controllers/donationController');
const {
  createDonationRules,
  listDonationRules,
  donationIdRules,
  updateStatusRules,
} = require('../validators/donationValidators');
const validate = require('../middleware/validate');

const router = express.Router();

// All donation routes are donor-only and require a valid JWT.
router.use(protect, authorize('donor'))

// GET /api/donations/stats must be registered before /:id
router.get('/', listDonationRules, validate, listDonations)
router.get('/stats', getDonationStats)
router.post('/', createDonationRules, validate, createDonation)
router.get('/:id', donationIdRules, validate, getDonation)
router.patch('/:id/status', updateStatusRules, validate, updateDonationStatus)

module.exports = router;
