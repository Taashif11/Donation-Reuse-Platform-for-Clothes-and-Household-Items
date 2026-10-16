// Load environment variables from server/.env before anything else.
require('dotenv').config({ path: __dirname + '/.env' });

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Phase 13: refuse to start without a usable JWT secret. Signing tokens with
// a missing or placeholder secret would silently produce forgeable JWTs.
function assertJwtSecret() {
  const secret = process.env.JWT_SECRET
  const missing = !secret || secret === 'your_jwt_secret'
  const weak = typeof secret === 'string' && secret.length < 16

  if (missing || weak) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'JWT_SECRET is missing, still the .env.example placeholder, or shorter than 16 characters.'
      )
      console.error('Set a long random value in the environment before starting in production.')
      process.exit(1)
    }
    console.warn(
      'WARNING: JWT_SECRET is missing or weak - using it anyway is only acceptable in development.'
    )
  }
}

// Connect to MongoDB first, then start listening.
// In Phase 1 the database connection is optional so the API can start without it.
async function startServer() {
  assertJwtSecret()

  try {
    await connectDB();
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message);
    console.error('Server start aborted. Check MONGO_URI in server/.env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
