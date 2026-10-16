const mongoose = require('mongoose');

// Extra donor details kept separate from the login account.
const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Default pickup address the donor can reuse when creating donations.
    defaultLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    // Short note shown to receiving organizations (optional).
    about: {
      type: String,
      trim: true,
      maxlength: [300, 'About cannot exceed 300 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DonorProfile', donorProfileSchema);
