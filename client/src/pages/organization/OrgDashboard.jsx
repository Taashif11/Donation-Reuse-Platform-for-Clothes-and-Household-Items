import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import organizationService from '../../services/organizationService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import DonationTable from '../../components/DonationTable'

// Explains what each verification status means for the organization.
const VERIFICATION_BANNERS = {
  PENDING: 'Your organization profile is awaiting admin verification. You cannot receive donations until it is approved.',
  NEEDS_MORE_INFO: 'The admin needs more information before verification can continue. Update your profile and verification details.',
  REJECTED: 'Verification was rejected. Update your profile and contact the admin to reapply.',
}

export default function OrgDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadData() {
    setLoading(true)
    setError('')
    Promise.all([organizationService.getStats(), organizationService.getMyProfile()])
      .then(([statsRes, profileRes]) => {
        setStats(statsRes.data.stats)
        setOrganization(profileRes.data.organization)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load dashboard data.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <LoadingSpinner label="Loading your dashboard..." />

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{error}</p>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadData}>
          Try again
        </button>
      </div>
    )
  }

  const banner = VERIFICATION_BANNERS[organization?.verificationStatus] || ''

  const cards = [
    { label: 'Total requests', value: stats?.total ?? 0, className: 'text-success' },
    { label: 'Needs your action', value: stats?.pending ?? 0, className: 'text-secondary' },
    { label: 'In progress', value: stats?.active ?? 0, className: 'text-info' },
    { label: 'Items promised', value: stats?.totalItems ?? 0, className: 'text-success' },
  ]

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Welcome, {organization?.organizationName || user?.name} 👋</h1>
          <p className="text-muted mb-0 small">Here is what is happening with your donations.</p>
        </div>
        <Link to="/organization/requests" className="btn btn-success">
          View Donation Requests
        </Link>
      </div>

      {banner && (
        <div className="alert alert-warning" role="status">
          <strong>Verification status: {organization.verificationStatus}</strong> {banner}
          <Link to="/organization/profile" className="alert-link d-block mt-1">
            Complete your organization profile
          </Link>
        </div>
      )}

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-6 col-xl-3" key={card.label}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className={`display-6 fw-bold ${card.className}`}>{card.value}</div>
                <div className="text-muted small">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Quick actions</h2>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/organization/requests" className="btn btn-success btn-sm">
              Review Requests
            </Link>
            <Link to="/organization/profile" className="btn btn-outline-secondary btn-sm">
              Organization Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 text-uppercase text-muted mb-0">Recent requests</h2>
            {stats?.total > 5 && (
              <Link to="/organization/requests" className="small">
                View all
              </Link>
            )}
          </div>

          {!stats?.total ? (
            <EmptyState
              title="No donation requests yet"
              message="When donors choose your organization, their requests will appear here for you to accept or decline."
              action={
                <Link to="/organization/profile" className="btn btn-success">
                  Complete your profile
                </Link>
              }
            />
          ) : (
            <DonationTable donations={stats.recent} basePath="/organization" donorColumn />
          )}
        </div>
      </div>
    </>
  )
}
