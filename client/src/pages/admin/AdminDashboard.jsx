import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import adminService from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'

// Simple platform overview for the admin (Phase 9) - no charts, just numbers.
export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadData() {
    setLoading(true)
    setError('')
    adminService
      .getStats()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load the dashboard.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <LoadingSpinner label="Loading the admin dashboard..." />

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

  const cards = [
    { label: 'Total users', value: stats?.users?.total ?? 0, className: 'text-success' },
    { label: 'Total organizations', value: stats?.organizations?.total ?? 0, className: 'text-primary' },
    { label: 'Pending organizations', value: stats?.organizations?.pending ?? 0, className: 'text-warning' },
    { label: 'Total donations', value: stats?.donations?.total ?? 0, className: 'text-success' },
    { label: 'Active donations', value: stats?.donations?.active ?? 0, className: 'text-info' },
    { label: 'Distributed donations', value: stats?.donations?.distributed ?? 0, className: 'text-success' },
  ]

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Admin dashboard</h1>
          <p className="text-muted small mb-0">Platform overview at a glance.</p>
        </div>
        <Link to="/admin/organizations" className="btn btn-success">
          Review Organizations
        </Link>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-6 col-xl-4" key={card.label}>
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
            <Link to="/admin/organizations" className="btn btn-success btn-sm">
              Verification Queue
              {(stats?.organizations?.pending ?? 0) > 0 && (
                <span className="badge text-bg-light text-success ms-2">
                  {stats.organizations.pending}
                </span>
              )}
            </Link>
            <Link to="/admin/users" className="btn btn-outline-secondary btn-sm">
              Manage Users
            </Link>
            <Link to="/admin/donations" className="btn btn-outline-secondary btn-sm">
              View Donations
            </Link>
            <Link to="/admin/categories" className="btn btn-outline-secondary btn-sm">
              Manage Categories
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Recent donations</h2>
              {!stats?.recentDonations?.length ? (
                <p className="text-muted small mb-0">No donations yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Donor</th>
                        <th scope="col">Organization</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentDonations.map((donation) => (
                        <tr key={donation._id}>
                          <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                          <td>{donation.donor?.name || '-'}</td>
                          <td>{donation.organization?.organizationName || '-'}</td>
                          <td>
                            <StatusBadge status={donation.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Newest accounts</h2>
              {!stats?.recentUsers?.length ? (
                <p className="text-muted small mb-0">No accounts yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {stats.recentUsers.map((account) => (
                    <li
                      className="list-group-item d-flex justify-content-between align-items-center px-0"
                      key={account._id}
                    >
                      <div>
                        <div className="fw-semibold">{account.name}</div>
                        <div className="small text-muted">{account.email}</div>
                      </div>
                      <span className="badge text-bg-light text-dark border text-capitalize">
                        {account.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
