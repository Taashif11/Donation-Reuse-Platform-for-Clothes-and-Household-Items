import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import complaintService from '../../services/complaintService'
import { getApiErrorMessage } from '../../utils/validation'
import { COMPLAINT_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import StatusBadge from '../../components/StatusBadge'

const PAGE_SIZE = 10

// Admin complaint queue: status filter + free-text search + pagination.
export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const params = { page, limit: PAGE_SIZE }
    if (status) params.status = status
    if (query) params.q = query

    complaintService
      .adminList(params)
      .then((res) => {
        if (cancelled) return
        setComplaints(res.data.complaints)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load complaints.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, query, page])

  function handleSearch(event) {
    event.preventDefault()
    setPage(1)
    setQuery(search.trim())
    setLoading(true)
    setError('')
  }

  function handleStatusChange(event) {
    setStatus(event.target.value)
    setPage(1)
    setLoading(true)
    setError('')
  }

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Complaints</h1>
          <p className="text-muted small mb-0">
            Review every complaint raised by donors and organizations.
          </p>
        </div>
        <Link to="/admin" className="btn btn-outline-secondary">
          Back to dashboard
        </Link>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-lg-4">
              <label htmlFor="complaint-status" className="form-label small text-muted">
                Filter by status
              </label>
              <select
                id="complaint-status"
                className="form-select form-select-sm"
                value={status}
                onChange={handleStatusChange}
              >
                <option value="">All statuses</option>
                {COMPLAINT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-5">
              <form onSubmit={handleSearch} className="d-flex gap-2">
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Search subject or description"
                  aria-label="Search complaints"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button type="submit" className="btn btn-outline-secondary btn-sm">
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <LoadingSpinner label="Loading complaints..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              title="No complaints found"
              message={
                status || query
                  ? 'Try a different filter or search term.'
                  : 'Complaints raised by donors and organizations will appear here.'
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Subject</th>
                      <th scope="col">Raised by</th>
                      <th scope="col">Status</th>
                      <th scope="col">Donation</th>
                      <th scope="col">Raised</th>
                      <th scope="col" className="text-end">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint) => (
                      <tr key={complaint._id}>
                        <td className="fw-semibold">{complaint.subject}</td>
                        <td>
                          <div>{complaint.user?.name || '-'}</div>
                          <div className="small text-muted">{complaint.user?.email || '-'}</div>
                        </td>
                        <td>
                          <StatusBadge status={complaint.status} />
                        </td>
                        <td>{complaint.donation ? `#${complaint.donation._id.slice(-6)}` : '-'}</td>
                        <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <Link
                            to={`/admin/complaints/${complaint._id}`}
                            className="btn btn-sm btn-outline-success"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
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
