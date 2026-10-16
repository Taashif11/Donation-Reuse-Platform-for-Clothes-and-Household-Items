import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import donationService from '../../services/donationService'
import { getApiErrorMessage } from '../../utils/validation'
import { DONATION_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import DonationTable from '../../components/DonationTable'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

export default function DonationHistory() {
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

    donationService
      .list(params)
      .then((res) => {
        if (cancelled) return
        setDonations(res.data.donations)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load donation history.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, page])

  // Loading/errors are reset in these event handlers, not in the effect above.
  function handleStatusChange(event) {
    setStatus(event.target.value)
    setPage(1)
    setLoading(true)
    setError('')
  }

  function handlePageChange(nextPage) {
    setPage(nextPage)
    setLoading(true)
    setError('')
  }

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Donation history</h1>
          <p className="text-muted small mb-0">All donations you have listed, newest first.</p>
        </div>
        <Link to="/donor/donate" className="btn btn-success">
          + New donation
        </Link>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <label htmlFor="history-status" className="form-label small text-muted">
            Filter by status
          </label>
          <select
            id="history-status"
            className="form-select form-select-sm"
            value={status}
            onChange={handleStatusChange}
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
            <LoadingSpinner label="Loading your donation history..." />
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
                  : 'Donations you create will show up here with their status updates.'
              }
              action={
                <Link to="/donor/donate" className="btn btn-success">
                  Create a donation
                </Link>
              }
            />
          ) : (
            <>
              <DonationTable donations={donations} />
              <Pagination
                pagination={{ page, totalPages, total }}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
