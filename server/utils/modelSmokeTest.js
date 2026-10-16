// Basic database smoke test for the Phase 3 models.
// Creates one document per model, reads it back with populate(), then cleans up.
// Usage: node utils/modelSmokeTest.js   (run from the server/ folder)

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const Donation = require('../models/Donation');
const DonationItem = require('../models/DonationItem');
const CollectionRequest = require('../models/CollectionRequest');
const Location = require('../models/Location');
const Notification = require('../models/Notification');
const Complaint = require('../models/Complaint');
const Category = require('../models/Category');

async function run() {
  const created = {};

  try {
    await connectDB();

    // Create one document per model.
    created.user = await User.create({
      name: 'Smoke Test Donor',
      email: 'smoke.test@example.com',
      password: 'secret123',
      role: 'donor',
    });
    created.adminUser = await User.create({
      name: 'Smoke Test Admin',
      email: 'smoke.admin@example.com',
      password: 'secret123',
      role: 'admin',
    });
    created.category = await Category.create({ name: 'Smoke Test Category' });
    created.location = await Location.create({
      addressLine: '12 Test Street',
      city: 'Testville',
      state: 'Test State',
      pincode: '123456',
    });
    created.profile = await DonorProfile.create({
      user: created.user._id,
      defaultLocation: created.location._id,
    });
    created.organization = await Organization.create({
      user: created.adminUser._id,
      organizationName: 'Smoke Test NGO',
      organizationType: 'ngo',
      email: 'ngo@example.com',
      city: 'Testville',
    });
    created.donation = await Donation.create({
      donor: created.user._id,
      organization: created.organization._id,
      pickupAddress: '12 Test Street, Testville',
      pickupLocation: created.location._id,
    });
    created.item = await DonationItem.create({
      donation: created.donation._id,
      category: created.category._id,
      itemType: 'Winter coats',
      quantity: 3,
      condition: 'Good',
    });
    created.donation.items.push(created.item._id);
    await created.donation.save();
    created.collection = await CollectionRequest.create({
      donation: created.donation._id,
      donor: created.user._id,
      organization: created.organization._id,
      address: '12 Test Street, Testville',
      scheduledDate: new Date(),
      scheduledTime: '10:00 - 12:00',
    });
    created.notification = await Notification.create({
      user: created.user._id,
      type: 'donation',
      title: 'Donation created',
      message: 'Your smoke test donation was created.',
      relatedDonation: created.donation._id,
    });
    created.complaint = await Complaint.create({
      user: created.user._id,
      donation: created.donation._id,
      subject: 'Smoke test complaint',
      description: 'Automated complaint created by the model smoke test.',
    });

    // Read back with populate to confirm references resolve.
    const donation = await Donation.findById(created.donation._id)
      .populate('donor', 'name email role')
      .populate('organization', 'organizationName verificationStatus')
      .populate('items');

    if (!donation.donor || !donation.organization || donation.items.length !== 1) {
      throw new Error('Populated donation is missing references');
    }

    // Confirm password protection works.
    const safeUser = await User.findById(created.user._id);
    if (safeUser.password !== undefined) {
      throw new Error('Password should be hidden from normal queries');
    }

    const userWithPassword = await User.findById(created.user._id).select('+password');
    if (!userWithPassword.password) {
      throw new Error('Password should be selectable with +password');
    }

    // Confirm validation rejects bad data.
    let validationWorked = false;
    try {
      await Category.create({});
    } catch (error) {
      validationWorked = error.name === 'ValidationError';
    }
    if (!validationWorked) {
      throw new Error('Schema validation did not reject an empty category');
    }

    console.log('Smoke test passed: 10 models created, referenced, populated and validated');
    console.log(
      `Donation "${donation._id}" -> donor: ${donation.donor.name}, org: ${donation.organization.organizationName}, items: ${donation.items.length}`
    );

    process.exitCode = 0;
  } catch (error) {
    console.error('Smoke test FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    // Remove the test documents so the database stays clean.
    for (const doc of Object.values(created)) {
      if (doc && doc.deleteOne) {
        await doc.deleteOne().catch(() => {});
      }
    }
    await mongoose.connection.close().catch(() => {});
  }
}

run();
