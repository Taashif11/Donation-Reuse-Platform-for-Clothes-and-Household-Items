import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import donationService from '../../services/donationService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import DonationTable from '../../components/DonationTable'

export default function DonorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadStats() {
    setLoading(true)
    setError('')
    donationService
      .getStats()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load dashboard data.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <LoadingSpinner label="Loading your dashboard..." />

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{error}</p>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadStats}>
          Try again
        </button>
      </div>
    )
  }

  const cards = [
    { label: 'Total donations', value: stats?.total ?? 0, className: 'text-success' },
    { label: 'Pending', value: stats?.byStatus?.PENDING ?? 0, className: 'text-secondary' },
    { label: 'Scheduled pickups', value: stats?.byStatus?.SCHEDULED ?? 0, className: 'text-info' },
    { label: 'Distributed', value: stats?.byStatus?.DISTRIBUTED ?? 0, className: 'text-success' },
  ]

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-muted mb-0 small">
            Here is what is happening with your donations.
          </p>
        </div>
        <Link to="/donor/donate" className="btn btn-success">
          + Donate Items
        </Link>
      </div>

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
            <Link to="/donor/donate" className="btn btn-success btn-sm">
              Donate Items
            </Link>
            <Link to="/donor/history" className="btn btn-outline-success btn-sm">
              View History
            </Link>
            <Link to="/donor/profile" className="btn btn-outline-secondary btn-sm">
              Update Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 text-uppercase text-muted mb-0">Recent donations</h2>
            {stats?.total > 5 && (
              <Link to="/donor/history" className="small">
                View all
              </Link>
            )}
          </div>

          {!stats?.total ? (
            <EmptyState
              title="No donations yet"
              message="List your first batch of clothes or household items and choose a verified organization to receive them."
              action={
                <Link to="/donor/donate" className="btn btn-success">
                  Create your first donation
                </Link>
              }
            />
          ) : (
            <DonationTable donations={stats.recent} />
          )}
        </div>
      </div>
    </>
  )
}
