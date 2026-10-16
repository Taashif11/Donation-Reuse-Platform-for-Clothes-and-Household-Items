const mongoose = require('mongoose');

// Every account on the platform (donor, organization staff or admin).
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // Never returned by queries unless explicitly selected (e.g. at login).
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [15, 'Phone number cannot exceed 15 characters'],
      default: '',
    },
    role: {
      type: String,
      enum: {
        values: ['donor', 'organization', 'admin'],
        message: 'Role must be donor, organization or admin',
      },
      default: 'donor',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Deactivated by an admin: the account cannot log in anymore.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // Safety net: even if password is selected, never serialize it in JSON.
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Frequently filtered by role on the admin user list.
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
