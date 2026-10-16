import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import adminService from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/validation'
import { DONATION_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import StatusBadge from '../../components/StatusBadge'

const PAGE_SIZE = 10

// Read-only oversight of every donation on the platform (Phase 9).
export default function AdminDonations() {
  const [donations, setDonations] = useState([])
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const params = { page, limit: PAGE_SIZE }
    if (status) params.status = status

    adminService
      .listDonations(params)
      .then((res) => {
        if (cancelled) return
        setDonations(res.data.donations)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load donations.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, page])

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Donations</h1>
          <p className="text-muted small mb-0">
            Every donation across all donors, newest first. Read-only.
          </p>
        </div>
        <Link to="/admin" className="btn btn-outline-secondary">
          Back to dashboard
        </Link>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <label htmlFor="donations-status" className="form-label small text-muted">
            Filter by status
          </label>
          <select
            id="donations-status"
            className="form-select form-select-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
              setLoading(true)
              setError('')
            }}
          >
            <option value="">All statuses</option>
            {DONATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <LoadingSpinner label="Loading donations..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : donations.length === 0 ? (
            <EmptyState
              title={status ? 'No donations match this filter' : 'No donations yet'}
              message={
                status
                  ? 'Try a different status filter.'
                  : 'Donations created by donors will show up here.'
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Donor</th>
                      <th scope="col">Organization</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Pickup</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((donation) => {
                      const totalQuantity = (donation.items || []).reduce(
                        (sum, item) => sum + (item.quantity || 0),
                        0
                      )

                      return (
                        <tr key={donation._id}>
                          <td>{new Date(donation.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="fw-semibold">{donation.donor?.name || '-'}</div>
                            <div className="small text-muted">{donation.donor?.email || ''}</div>
                          </td>
                          <td>{donation.organization?.organizationName || '-'}</td>
                          <td>{totalQuantity}</td>
                          <td>
                            {donation.scheduledDate
                              ? new Date(donation.scheduledDate).toLocaleDateString()
                              : 'Not scheduled'}
                          </td>
                          <td>
                            <StatusBadge status={donation.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                pagination={{ page, totalPages, total }}
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  setLoading(true)
                  setError('')
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
