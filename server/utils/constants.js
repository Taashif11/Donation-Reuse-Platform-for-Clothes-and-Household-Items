// Shared enum values used by the Mongoose models, validators and controllers.
// Keeping them here prevents the model and the API validation from drifting apart.

// Full donation lifecycle. REJECTED and CANCELLED are terminal.
const DONATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'SCHEDULED',
  'PICKED_UP',
  'RECEIVED',
  'DISTRIBUTED',
  'CANCELLED',
  'REJECTED',
]

// The happy path shown as a timeline/progress list (no terminal states).
const DONATION_STAGES = ['PENDING', 'ACCEPTED', 'SCHEDULED', 'PICKED_UP', 'RECEIVED', 'DISTRIBUTED']

// Statuses a donor is still allowed to cancel (before pickup is underway).
const CANCELLABLE_DONATION_STATUSES = ['PENDING', 'ACCEPTED', 'SCHEDULED']

// Statuses an organization may set on a donation addressed to it.
// Phase 8 adds the pickup/receipt/distribution steps via /api/collections.
const ORGANIZATION_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'REJECTED'],
}

// Donation statuses that do not count towards an organization's impact numbers.
const IGNORED_ORGANIZATION_STATUSES = ['CANCELLED', 'REJECTED']

// Collection (doorstep pickup) statuses. CANCELLED is only set when the donor
// cancels the donation - there is no direct API to cancel a collection.
const COLLECTION_STATUSES = ['SCHEDULED', 'PICKED_UP', 'RECEIVED', 'DISTRIBUTED', 'CANCELLED']

// Allowed collection transitions. Every transition also moves the donation.
const COLLECTION_TRANSITIONS = {
  SCHEDULED: ['PICKED_UP'],
  PICKED_UP: ['RECEIVED'],
  RECEIVED: ['DISTRIBUTED'],
  DISTRIBUTED: [],
  CANCELLED: [],
}

const ORGANIZATION_TYPES = ['ngo', 'orphanage', 'beneficiary', 'shelter', 'other']

const ITEM_CONDITIONS = ['New', 'Like New', 'Good', 'Usable']

// Account roles (mirrors the User model enum).
const USER_ROLES = ['donor', 'organization', 'admin']

// Organization verification statuses (mirrors the Organization model enum).
const VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO']

// Only these can be set by the admin - APPROVED and REJECTED are final.
const VERIFIABLE_VERIFICATION_STATUSES = ['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO']

// In-app notification categories (mirrors the Notification model enum).
const NOTIFICATION_TYPES = ['donation', 'collection', 'verification', 'complaint', 'general']

// Complaint lifecycle (mirrors the Complaint model enum). CLOSED is terminal.
const COMPLAINT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED']

// Allowed complaint transitions, driven by the admin only. CLOSED cannot reopen.
const COMPLAINT_TRANSITIONS = {
  OPEN: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
  IN_REVIEW: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}

// Admin may move a complaint to anything except back to OPEN.
const SETTABLE_COMPLAINT_STATUSES = ['IN_REVIEW', 'RESOLVED', 'CLOSED']

module.exports = {
  DONATION_STATUSES,
  DONATION_STAGES,
  CANCELLABLE_DONATION_STATUSES,
  ORGANIZATION_TRANSITIONS,
  IGNORED_ORGANIZATION_STATUSES,
  COLLECTION_STATUSES,
  COLLECTION_TRANSITIONS,
  ORGANIZATION_TYPES,
  ITEM_CONDITIONS,
  USER_ROLES,
  VERIFICATION_STATUSES,
  VERIFIABLE_VERIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  COMPLAINT_STATUSES,
  COMPLAINT_TRANSITIONS,
  SETTABLE_COMPLAINT_STATUSES,
};
