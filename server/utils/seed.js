// Development seed data: the standard donation categories plus clearly labeled
// demo accounts for local/manual testing.
// Usage: npm run seed   (run from the server/ folder)

require('dotenv').config({ path: __dirname + '/../.env' });
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const User = require('../models/User');
const Organization = require('../models/Organization');

const CATEGORIES = [
  { name: 'Clothing', description: 'Wearable clothes for all ages' },
  { name: 'Footwear', description: 'Shoes, sandals and slippers in usable condition' },
  { name: 'Books', description: 'School books, notebooks and reading material' },
  { name: 'Kitchen Items', description: 'Utensils, cookware and small kitchen equipment' },
  { name: 'Furniture', description: 'Chairs, tables, beds and storage units' },
  { name: 'Household Items', description: 'General household goods and essentials' },
  { name: 'Toys', description: 'Toys and games for children' },
  { name: 'Blankets', description: 'Blankets, bedsheets and bedding' },
  { name: 'Bags', description: 'School bags, travel bags and handbags' },
  { name: 'Other', description: 'Anything else that is useful and in usable condition' },
];

async function seedCategories() {
  let created = 0;
  let updated = 0;

  for (const item of CATEGORIES) {
    const existing = await Category.findOne({ name: item.name });

    if (existing) {
      // Keep the description fresh without touching other fields.
      existing.description = item.description;
      await existing.save();
      updated += 1;
    } else {
      await Category.create(item);
      created += 1;
    }
  }

  console.log(`Categories: ${created} created, ${updated} already existed`);
}

// Demo accounts (development only - never use these emails in production).
async function seedDemoAccounts() {
  // 1. Demo donor
  let donor = await User.findOne({ email: 'demo.donor@example.com' })
  if (!donor) {
    donor = await User.create({
      name: 'Demo Donor',
      email: 'demo.donor@example.com',
      password: await bcrypt.hash('demo123', 10),
      phone: '9000000001',
      role: 'donor',
      isVerified: true,
    })
    console.log('Demo donor created: demo.donor@example.com / demo123')
  } else {
    console.log('Demo donor already exists: demo.donor@example.com / demo123')
  }

  // 2. Demo NGO account + verified organization profile
  let ngoUser = await User.findOne({ email: 'demo.ngo@example.com' })
  if (!ngoUser) {
    ngoUser = await User.create({
      name: 'Demo NGO Coordinator',
      email: 'demo.ngo@example.com',
      password: await bcrypt.hash('demo123', 10),
      phone: '9000000002',
      role: 'organization',
      isVerified: true,
    })
    console.log('Demo NGO user created: demo.ngo@example.com / demo123')
  }

  let organization = await Organization.findOne({ user: ngoUser._id })
  if (!organization) {
    organization = await Organization.create({
      user: ngoUser._id,
      organizationName: 'Seva Foundation (Demo)',
      organizationType: 'ngo',
      description:
        'Demo organization that receives clothes and household items for redistribution to families in need.',
      contactPerson: 'Demo NGO Coordinator',
      email: 'demo.ngo@example.com',
      phone: '9000000002',
      address: '24 Community Lane',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      verificationStatus: 'APPROVED',
      verifiedAt: new Date(),
    })
    console.log('Demo verified organization created: Seva Foundation (Demo)')
  } else {
    console.log('Demo organization already exists')
  }

  // 3. Demo admin account (admins never self-register)
  let admin = await User.findOne({ email: 'demo.admin@example.com' })
  if (!admin) {
    admin = await User.create({
      name: 'Demo Admin',
      email: 'demo.admin@example.com',
      password: await bcrypt.hash('demo123', 10),
      phone: '9000000003',
      role: 'admin',
      isVerified: true,
      isActive: true,
    })
    console.log('Demo admin created: demo.admin@example.com / demo123')
  } else {
    console.log('Demo admin already exists: demo.admin@example.com / demo123')
  }
}

async function run() {
  try {
    await connectDB();
    await seedCategories();
    await seedDemoAccounts();
    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

run();
