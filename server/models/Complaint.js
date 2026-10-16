const mongoose = require('mongoose');

// Complaint or dispute raised by a donor or an organization, handled by admins.
const complaintSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: complaints linked to a specific donation.
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'],
        message: 'Status must be OPEN, IN_REVIEW, RESOLVED or CLOSED',
      },
      default: 'OPEN',
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [2000, 'Response cannot exceed 2000 characters'],
      default: '',
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Admin work queue and "my complaints" lists.
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
