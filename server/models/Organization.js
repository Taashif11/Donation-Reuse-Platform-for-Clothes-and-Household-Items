const mongoose = require('mongoose');

// An NGO, orphanage or beneficiary that receives donations.
// Nothing here becomes visible to donors until verificationStatus is APPROVED.
const organizationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [120, 'Organization name cannot exceed 120 characters'],
    },
    organizationType: {
      type: String,
      enum: {
        values: ['ngo', 'orphanage', 'beneficiary', 'shelter', 'other'],
        message: 'Organization type must be ngo, orphanage, beneficiary, shelter or other',
      },
      default: 'ngo',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [80, 'Contact person cannot exceed 80 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [15, 'Phone number cannot exceed 15 characters'],
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
      default: '',
    },
    city: {
      type: String,
      trim: true,
      maxlength: [60, 'City cannot exceed 60 characters'],
      default: '',
    },
    state: {
      type: String,
      trim: true,
      maxlength: [60, 'State cannot exceed 60 characters'],
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^[0-9A-Za-z\s-]{3,10}$/, 'Please provide a valid pincode'],
      default: '',
    },
    // Phase 12: geocoded copy of the address above (used by "near me"
    // searches and the map preview). Filled automatically when the profile
    // address is saved.
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },

    // ---------- Verification ----------
    verificationStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO'],
        message: 'Verification status must be PENDING, APPROVED, REJECTED or NEEDS_MORE_INFO',
      },
      default: 'PENDING',
    },
    verificationDetails: {
      registrationNumber: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
      establishedYear: { type: Number, min: 1800, max: 2100, default: null },
    },
    // Files/links submitted as proof (stored as URLs or upload paths).
    verificationDocuments: [
      {
        name: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' },
      },
    ],
    // Feedback left by the admin when approving/rejecting or asking for more info.
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Verification notes cannot exceed 500 characters'],
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Public directory filters by verification status and city.
organizationSchema.index({ verificationStatus: 1, city: 1 });
organizationSchema.index({ organizationType: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
