const express = require('express');

// Single entry point for the whole API: app.use('/api', require('./routes'))
// New resource routers are mounted here as the matching phase is built.
const router = express.Router();

router.use('/health', require('./healthRoutes'))
router.use('/auth', require('./authRoutes'))
router.use('/users', require('./userRoutes'))
router.use('/donations', require('./donationRoutes'))
router.use('/categories', require('./categoryRoutes'))
router.use('/organizations', require('./organizationRoutes'))
router.use('/collections', require('./collectionRoutes'))
router.use('/notifications', require('./notificationRoutes'))
router.use('/complaints', require('./complaintRoutes'))
// Phase 12 - geocoding + nearby search (any signed-in role).
router.use('/locations', require('./locationRoutes'))
router.use('/admin', require('./adminRoutes'))

module.exports = router;
