const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  scheduleCollection,
  listCollections,
  getCollection,
  getTracking,
  rescheduleCollection,
  updateCollectionStatus,
} = require('../controllers/collectionController');
const {
  scheduleRules,
  rescheduleRules,
  listCollectionRules,
  collectionIdRules,
  updateStatusRules,
} = require('../validators/collectionValidators');
const validate = require('../middleware/validate');

const router = express.Router();

// Every collection belongs to a donor and an organization, so both roles
// (and the admin) may read them. Scope is enforced inside the controller.
router.use(protect, authorize('donor', 'organization', 'admin'))

// GET /api/collections  (?status=&donation=&page=&limit=)
router.get('/', listCollectionRules, validate, listCollections)

// POST /api/collections - schedule a pickup for an accepted donation.
router.post('/', scheduleRules, validate, scheduleCollection)

// GET /api/collections/:id
router.get('/:id', collectionIdRules, validate, getCollection)

// GET /api/collections/:id/tracking - timeline of the linked donation.
router.get('/:id/tracking', collectionIdRules, validate, getTracking)

// PATCH /api/collections/:id - reschedule while the pickup is still SCHEDULED.
router.patch('/:id', rescheduleRules, validate, rescheduleCollection)

// PATCH /api/collections/:id/status - only the receiving organization advances it.
router.patch(
  '/:id/status',
  authorize('organization', 'admin'),
  updateStatusRules,
  validate,
  updateCollectionStatus
)

module.exports = router;
