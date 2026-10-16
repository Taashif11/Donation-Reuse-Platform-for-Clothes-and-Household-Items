const express = require('express');
const { protect } = require('../middleware/auth');
const { getMe, updateMe } = require('../controllers/userController');
const { updateMeRules } = require('../validators/userValidators');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/users/me - any authenticated role
router.get('/me', protect, getMe)

// PATCH /api/users/me - any authenticated role (own profile only)
router.patch('/me', protect, updateMeRules, validate, updateMe)

module.exports = router;
