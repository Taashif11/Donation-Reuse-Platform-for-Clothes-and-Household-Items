const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind Render/Heroku/nginx the proxy sets X-Forwarded-For; without this
// express-rate-limit sees the proxy IP and every client shares one bucket.
// Only enabled in production so local development behaves normally.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ---------- Global middleware ----------
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Phase 13: strip NoSQL-operator-looking keys ($gt, a.b) from every request
// BEFORE any route handler or validator runs.
app.use('/api', sanitize);

// Phase 13: global per-IP throttle (auth routes add a stricter one of their own).
app.use('/api', apiLimiter);

// Uploaded item images are stored locally and served statically.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Routes ----------
// All API endpoints live under /api (see routes/index.js).
app.use('/api', routes)

// ---------- Not found ----------
app.use(notFound)

// ---------- Central error handler ----------
app.use(errorHandler)

module.exports = app;
