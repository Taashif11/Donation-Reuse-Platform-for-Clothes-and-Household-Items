const mongoose = require('mongoose');

// Reusable pickup/address point used by donations and donor profiles.
const locationSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [60, 'City cannot exceed 60 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [60, 'State cannot exceed 60 characters'],
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^[0-9A-Za-z\s-]{3,10}$/, 'Please provide a valid pincode'],
    },
    // Optional coordinates filled in by the map/location service.
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
      default: null,
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
      default: null,
    },
    // GeoJSON mirror of the two fields above, kept in sync automatically.
    // Only written when both coordinates exist, so the 2dsphere index can
    // power the "near me" search ($geoNear) without extra query logic.
    geo: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }, // [longitude, latitude]
    },
  },
  { timestamps: true }
);

// Phase 12: keep geo consistent with latitude/longitude on every save.
locationSchema.pre('validate', function () {
  if (this.latitude != null && this.longitude != null) {
    this.geo = { type: 'Point', coordinates: [this.longitude, this.latitude] }
  } else {
    this.geo = undefined
  }
});

// Multi-city filtering and lookups by area.
locationSchema.index({ city: 1 });
locationSchema.index({ pincode: 1 });
// MongoDB skips documents where the geo field is missing, so locations
// without coordinates simply do not appear in radius searches.
locationSchema.index({ geo: '2dsphere' });

module.exports = mongoose.model('Location', locationSchema);
