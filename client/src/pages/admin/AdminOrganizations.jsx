import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import adminService from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/validation'
import { VERIFICATION_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import StatusBadge from '../../components/StatusBadge'

const PAGE_SIZE = 10

// Verification queue: every organization, filterable by verification status.
export default function AdminOrganizations() {
  const [organizations, setOrganizations] = useState([])
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
    if (status) params.verificationStatus = status
    if (query) params.q = query

    adminService
      .listOrganizations(params)
      .then((res) => {
        if (cancelled) return
        setOrganizations(res.data.organizations)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load organizations.'))
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
          <h1 className="h4 mb-1">Organizations</h1>
          <p className="text-muted small mb-0">
            Review and verify NGO, orphanage and beneficiary accounts.
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
              <label htmlFor="org-status" className="form-label small text-muted">
                Filter by verification status
              </label>
              <select
                id="org-status"
                className="form-select form-select-sm"
                value={status}
                onChange={handleStatusChange}
              >
                <option value="">All statuses</option>
                <option value="PENDING">PENDING (needs review)</option>
                <option value="NEEDS_MORE_INFO">NEEDS_MORE_INFO</option>
                {VERIFICATION_STATUSES.filter(
                  (item) => item !== 'PENDING' && item !== 'NEEDS_MORE_INFO'
                ).map((item) => (
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
                  placeholder="Search by name or city"
                  aria-label="Search organizations"
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
            <LoadingSpinner label="Loading organizations..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState
              title="No organizations found"
              message={
                status || query
                  ? 'Try a different filter or search term.'
                  : 'New organizations will appear here once they register.'
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Organization</th>
                      <th scope="col">Type</th>
                      <th scope="col">City</th>
                      <th scope="col">Verification</th>
                      <th scope="col">Registered</th>
                      <th scope="col" className="text-end">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((organization) => (
                      <tr key={organization._id}>
                        <td>
                          <div className="fw-semibold">{organization.organizationName}</div>
                          <div className="small text-muted">{organization.user?.email || '-'}</div>
                        </td>
                        <td className="text-capitalize">{organization.organizationType}</td>
                        <td>{organization.city || '-'}</td>
                        <td>
                          <StatusBadge status={organization.verificationStatus} />
                        </td>
                        <td>{new Date(organization.createdAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <Link
                            to={`/admin/organizations/${organization._id}`}
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
