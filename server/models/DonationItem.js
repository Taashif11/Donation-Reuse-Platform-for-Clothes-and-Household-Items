const mongoose = require('mongoose');
const { ITEM_CONDITIONS } = require('../utils/constants');

// One line item inside a donation (category, quantity, condition, photo).
const donationItemSchema = new mongoose.Schema(
  {
    // Back-reference so queries/reports can find "all book items" etc.
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    // Free text item name, e.g. "Winter jackets" or "Steel utensils".
    itemType: {
      type: String,
      trim: true,
      maxlength: [80, 'Item type cannot exceed 80 characters'],
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [1000, 'Quantity cannot exceed 1000'],
    },
    condition: {
      type: String,
      enum: {
        values: ITEM_CONDITIONS,
        message: 'Condition must be New, Like New, Good or Usable',
      },
      required: [true, 'Condition is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    // Relative path to the uploaded image, e.g. /uploads/abc123.jpg
    image: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

donationItemSchema.index({ donation: 1 });
donationItemSchema.index({ category: 1 });

module.exports = mongoose.model('DonationItem', donationItemSchema);
