// Shared constants used across the frontend.

export const USER_ROLES = {
  DONOR: 'donor',
  ORGANIZATION: 'organization',
  ADMIN: 'admin',
}

// Where each role lands after logging in (the admin dashboard arrives in Phase 9).
export const DASHBOARD_PATHS = {
  donor: '/donor',
  organization: '/organization',
  admin: '/admin',
}

// Donation lifecycle statuses (mirror of the backend enum).
export const DONATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'SCHEDULED',
  'PICKED_UP',
  'RECEIVED',
  'DISTRIBUTED',
  'CANCELLED',
  'REJECTED',
]

// The happy path shown as a timeline (no terminal states).
export const DONATION_STAGES = [
  'PENDING',
  'ACCEPTED',
  'SCHEDULED',
  'PICKED_UP',
  'RECEIVED',
  'DISTRIBUTED',
]

// Collection (doorstep pickup) statuses.
export const COLLECTION_STATUSES = [
  'SCHEDULED',
  'PICKED_UP',
  'RECEIVED',
  'DISTRIBUTED',
  'CANCELLED',
]

// What the organization may do next, keyed by the current collection status.
export const COLLECTION_NEXT_ACTIONS = {
  SCHEDULED: 'PICKED_UP',
  PICKED_UP: 'RECEIVED',
  RECEIVED: 'DISTRIBUTED',
}

// Statuses a donor may still cancel from the donation details page.
export const CANCELLABLE_STATUSES = ['PENDING', 'ACCEPTED', 'SCHEDULED']

// Organization verification statuses (mirror of the backend enum).
export const VERIFICATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'NEEDS_MORE_INFO',
]

// What the admin may decide (APPROVED and REJECTED are final).
export const VERIFICATION_ACTIONS = ['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO']

// Account status filter on the admin user list.
export const USER_STATUS_FILTERS = [
  { value: '', label: 'All accounts' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Deactivated only' },
]

// In-app notification categories (mirror of the backend enum).
export const NOTIFICATION_TYPES = ['donation', 'collection', 'verification', 'complaint', 'general']

// Complaint statuses (mirror of the backend enum). CLOSED is terminal.
export const COMPLAINT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED']

// What the admin may do next, keyed by the current complaint status.
export const COMPLAINT_NEXT_ACTIONS = {
  OPEN: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
  IN_REVIEW: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}
