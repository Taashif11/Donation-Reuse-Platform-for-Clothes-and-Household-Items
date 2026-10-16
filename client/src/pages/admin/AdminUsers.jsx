import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import adminService from '../../services/adminService'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../utils/validation'
import { USER_ROLES, USER_STATUS_FILTERS } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

// Manage every account: filter, search, activate/deactivate.
export default function AdminUsers() {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingId, setSavingId] = useState('')

  useEffect(() => {
    let cancelled = false

    const params = { page, limit: PAGE_SIZE }
    if (role) params.role = role
    if (status) params.status = status
    if (query) params.q = query

    adminService
      .listUsers(params)
      .then((res) => {
        if (cancelled) return
        setUsers(res.data.users)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load users.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [role, status, query, page])

  function handleSearch(event) {
    event.preventDefault()
    setPage(1)
    setQuery(search.trim())
    setLoading(true)
    setError('')
  }

  function handleFilterChange(setter) {
    return (event) => {
      setter(event.target.value)
      setPage(1)
      setLoading(true)
      setError('')
    }
  }

  async function handleToggle(account) {
    const isActive = account.isActive === false
    setActionError('')
    setSavingId(account._id)

    try {
      await adminService.updateUserStatus(account._id, isActive)
      setUsers((prev) =>
        prev.map((item) => (item._id === account._id ? { ...item, isActive } : item))
      )
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to update this account.'))
    } finally {
      setSavingId('')
    }
  }

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Users</h1>
          <p className="text-muted small mb-0">
            Search accounts, filter by role and activate or deactivate them.
          </p>
        </div>
        <Link to="/admin" className="btn btn-outline-secondary">
          Back to dashboard
        </Link>
      </div>

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-4 col-lg-3">
              <label htmlFor="users-role" className="form-label small text-muted">
                Role
              </label>
              <select
                id="users-role"
                className="form-select form-select-sm"
                value={role}
                onChange={handleFilterChange(setRole)}
              >
                <option value="">All roles</option>
                {USER_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-4 col-lg-3">
              <label htmlFor="users-status" className="form-label small text-muted">
                Account status
              </label>
              <select
                id="users-status"
                className="form-select form-select-sm"
                value={status}
                onChange={handleFilterChange(setStatus)}
              >
                {USER_STATUS_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-4 col-lg-4">
              <form onSubmit={handleSearch} className="d-flex gap-2">
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Search by name or email"
                  aria-label="Search users"
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
            <LoadingSpinner label="Loading users..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              message="Try a different role, status or search term."
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Joined</th>
                      <th scope="col" className="text-end">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((account) => {
                      const isSelf = account._id === user?._id
                      const active = account.isActive !== false

                      return (
                        <tr key={account._id}>
                          <td className="fw-semibold">{account.name}</td>
                          <td>{account.email}</td>
                          <td>
                            <span className="badge text-bg-light text-dark border text-capitalize">
                              {account.role}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${active ? 'text-bg-success' : 'text-bg-danger'}`}
                            >
                              {active ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                active ? 'btn-outline-danger' : 'btn-outline-success'
                              }`}
                              disabled={isSelf || savingId === account._id}
                              title={isSelf ? 'You cannot change your own account status' : ''}
                              onClick={() => handleToggle(account)}
                            >
                              {savingId === account._id
                                ? 'Saving...'
                                : active
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </button>
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
