const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const { toSafeUser } = require('../utils/safeUser');
const { success, failure } = require('../utils/apiResponse');

function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

// POST /api/auth/register
async function register(req, res) {
  const { name, password, phone, role } = req.body
  const email = normalizeEmail(req.body.email)

  const existing = await User.findOne({ email })
  if (existing) {
    return failure(res, 'An account with this email already exists', 409)
  }

  // Hash with bcrypt before anything touches the database.
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await User.create({
    name: String(name).trim(),
    email,
    password: hashedPassword,
    phone: phone ? String(phone).trim() : '',
    role,
  })

  return success(res, 'Account created successfully', { user: toSafeUser(user) }, 201)
}

// POST /api/auth/login
async function login(req, res) {
  const email = normalizeEmail(req.body.email)
  const { password } = req.body

  // Password is select:false on the model, so request it explicitly for comparison.
  const user = await User.findOne({ email }).select('+password')

  // Same message for unknown email and wrong password (no account enumeration).
  if (!user) {
    return failure(res, 'Invalid email or password', 401)
  }

  const passwordMatches = await bcrypt.compare(password, user.password)
  if (!passwordMatches) {
    return failure(res, 'Invalid email or password', 401)
  }

  // Deactivated accounts (admin action) cannot sign in.
  if (user.isActive === false) {
    return failure(res, 'Your account has been deactivated. Please contact the platform admin.', 403)
  }

  const token = signToken(user)

  return success(res, 'Login successful', {
    token,
    user: toSafeUser(user),
  })
}

// GET /api/auth/me  (requires valid JWT - req.user set by protect middleware)
async function getMe(req, res) {
  return success(res, 'Profile fetched successfully', {
    user: toSafeUser(req.user),
  })
}

module.exports = { register, login, getMe };
