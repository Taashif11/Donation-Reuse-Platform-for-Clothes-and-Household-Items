const mongoose = require('mongoose');
const { COLLECTION_STATUSES } = require('../utils/constants');

// Doorstep pickup created/updated once a donation is accepted and scheduled.
const collectionRequestSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      unique: true, // one collection per donation
    },
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
    // Snapshot of the pickup address at scheduling time.
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    scheduledTime: {
      type: String,
      required: [true, 'Scheduled time is required'],
      trim: true,
      maxlength: [40, 'Scheduled time cannot exceed 40 characters'],
    },
    status: {
      type: String,
      enum: {
        values: COLLECTION_STATUSES,
        message: 'Invalid collection status',
      },
      default: 'SCHEDULED',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

// Active pickups are looked up per organization/donor and per date.
collectionRequestSchema.index({ organization: 1, status: 1 });
collectionRequestSchema.index({ donor: 1, status: 1 });
collectionRequestSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('CollectionRequest', collectionRequestSchema);
