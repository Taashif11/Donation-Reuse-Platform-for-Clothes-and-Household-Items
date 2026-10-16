const mongoose = require('mongoose');

// Establish a single MongoDB connection used by the whole API.
function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    return Promise.reject(new Error('MONGO_URI is not defined in the environment'));
  }

  mongoose.connect(mongoUri);

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected:', mongoose.connection.host);
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  return mongoose.connection.asPromise();
}

module.exports = connectDB;
