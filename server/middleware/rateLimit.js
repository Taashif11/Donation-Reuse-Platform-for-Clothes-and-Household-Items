const { rateLimit } = require('express-rate-limit');

// Phase 13 - global API throttle. The auth routes keep their own, much
// stricter limiter (see routes/authRoutes.js); this one only caps the
// overall request volume per IP so scrapers and runaway clients cannot
// hammer the API. /api/health is excluded so uptime monitors stay green.

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/health'),
  message: { success: false, message: 'Too many requests - please slow down' },
})

module.exports = { apiLimiter };
