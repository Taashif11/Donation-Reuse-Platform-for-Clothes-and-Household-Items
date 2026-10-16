const mongoose = require('mongoose');
const { DONATION_STATUSES } = require('../utils/constants');

// The donation request created by a donor, tracked until it is completed.
const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    // References to the DonationItem documents belonging to this donation.
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DonationItem',
      },
    ],
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
      maxlength: [300, 'Pickup address cannot exceed 300 characters'],
    },
    // Full address + optional coordinates for the map.
    pickupLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    // Free text slot such as "10:00 - 12:00".
    scheduledTime: {
      type: String,
      trim: true,
      maxlength: [40, 'Scheduled time cannot exceed 40 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: DONATION_STATUSES,
        message: 'Invalid donation status',
      },
      default: 'PENDING',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Cancellation reason cannot exceed 300 characters'],
      default: '',
    },
    // Feedback given by the organization when it rejects the request.
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Rejection reason cannot exceed 300 characters'],
      default: '',
    },
    // Append-only audit of every status change (drives the tracking timeline).
    statusHistory: [
      {
        status: {
          type: String,
          enum: DONATION_STATUSES,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Record the status every time it changes so tracking can show "when".
// Mongoose 9 runs this async style - no `next` callback.
donationSchema.pre('save', function () {
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() })
  }
})

// Donation lists are filtered by owner, organization and status over time.
donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ organization: 1, status: 1 });
donationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);
