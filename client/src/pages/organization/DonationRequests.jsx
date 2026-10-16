import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import organizationService from '../../services/organizationService'
import { getApiErrorMessage } from '../../utils/validation'
import { DONATION_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import DonationTable from '../../components/DonationTable'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

// Incoming donation requests addressed to the signed-in organization.
export default function DonationRequests() {
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

    organizationService
      .listDonations(params)
      .then((res) => {
        if (cancelled) return
        setDonations(res.data.donations)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load donation requests.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, page])

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
          <h1 className="h4 mb-1">Donation requests</h1>
          <p className="text-muted small mb-0">
            Requests from donors who chose your organization, newest first.
          </p>
        </div>
        <Link to="/organization" className="btn btn-outline-secondary">
          Back to dashboard
        </Link>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <label htmlFor="requests-status" className="form-label small text-muted">
            Filter by status
          </label>
          <select
            id="requests-status"
            className="form-select form-select-sm"
            value={status}
            onChange={handleStatusChange}
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING (needs your action)</option>
            {DONATION_STATUSES.filter((item) => item !== 'PENDING').map((item) => (
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
            <LoadingSpinner label="Loading donation requests..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : donations.length === 0 ? (
            <EmptyState
              title={status ? 'No requests match this filter' : 'No donation requests yet'}
              message={
                status
                  ? 'Try a different status filter.'
                  : 'Donations addressed to your organization will show up here.'
              }
            />
          ) : (
            <>
              <DonationTable
                donations={donations}
                basePath="/organization"
                donorColumn
              />
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
