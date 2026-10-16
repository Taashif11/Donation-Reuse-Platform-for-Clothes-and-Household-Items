// Consistent colored badge for every donation/collection/verification status.
const STATUS_STYLES = {
  PENDING: 'text-bg-secondary',
  ACCEPTED: 'text-bg-primary',
  SCHEDULED: 'text-bg-info text-dark',
  PICKED_UP: 'text-bg-warning text-dark',
  RECEIVED: 'text-bg-success',
  DISTRIBUTED: 'text-bg-success',
  CANCELLED: 'text-bg-danger',
  REJECTED: 'text-bg-danger',
  // Organization verification (Phase 9)
  APPROVED: 'text-bg-success',
  NEEDS_MORE_INFO: 'text-bg-warning text-dark',
  // Complaint workflow (Phase 10)
  OPEN: 'text-bg-warning text-dark',
  IN_REVIEW: 'text-bg-info text-dark',
  RESOLVED: 'text-bg-success',
  CLOSED: 'text-bg-secondary',
}

export default function StatusBadge({ status }) {
  const label = (status || 'UNKNOWN').replace(/_/g, ' ')
  const style = STATUS_STYLES[status] || 'text-bg-secondary'

  return <span className={`badge ${style}`}>{label}</span>
}
