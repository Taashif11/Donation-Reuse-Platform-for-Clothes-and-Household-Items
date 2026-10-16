const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { failure } = require('../utils/apiResponse');

// Verifies the "Authorization: Bearer <token>" header and loads the user.
// Rejects missing, malformed, expired or invalid tokens with 401.
async function protect(req, res, next) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return failure(res, 'Not authorized - no token provided', 401)
  }

  const token = header.slice(7)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id)
    if (!user) {
      return failure(res, 'Not authorized - account no longer exists', 401)
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return failure(res, 'Session expired - please log in again', 401)
    }
    return failure(res, 'Not authorized - invalid token', 401)
  }
}

// Restricts a route to specific roles: authorize('admin'), authorize('donor', 'organization')
// Must run after protect (it reads req.user).
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return failure(res, 'Not authorized - please log in', 401)
    }

    if (!allowedRoles.includes(req.user.role)) {
      return failure(res, 'Forbidden - insufficient permissions', 403)
    }

    next()
  }
}

module.exports = { protect, authorize };
