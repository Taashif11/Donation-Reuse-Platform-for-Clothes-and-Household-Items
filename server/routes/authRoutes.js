const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerRules, loginRules } = require('../validators/authValidators');
const validate = require('../middleware/validate');

const router = express.Router();

// Brute-force protection for the credential endpoints (not for /me,
// which is called on every page load by logged-in users).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // 50 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts - please try again later' },
})

// POST /api/auth/register
router.post('/register', authLimiter, registerRules, validate, register)

// POST /api/auth/login
router.post('/login', authLimiter, loginRules, validate, login)

// GET /api/auth/me
router.get('/me', protect, getMe)

module.exports = router;
