import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import complaintService from '../services/complaintService'
import donationService from '../services/donationService'
import organizationService from '../services/organizationService'
import { getApiErrorMessage } from '../utils/validation'
import { COMPLAINT_STATUSES, DASHBOARD_PATHS } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'

const PAGE_SIZE = 10

// Short, readable label for the "link to donation" dropdown.
function donationLabel(donation) {
  return `#${donation._id.slice(-6)} - ${donation.status} - ${new Date(
    donation.createdAt
  ).toLocaleDateString()}`
}

// Complaints raised by the signed-in donor or organization (Phase 10).
// One page handles creating, listing and reading a single complaint.
export default function Complaints() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id') || ''

  const [complaints, setComplaints] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail for ?id=... - stored together with the id it belongs to, so the
  // loading/error flags can be derived during render instead of set in an effect.
  const [detail, setDetail] = useState({ id: '', complaint: null, error: '' })

  const [form, setForm] = useState({ subject: '', description: '', donation: '' })
  const [donations, setDonations] = useState([])

  const detailLoading = Boolean(selectedId) && detail.id !== selectedId
  const selected = selectedId && detail.id === selectedId ? detail.complaint : null
  const detailError = selectedId && detail.id === selectedId ? detail.error : ''

  // List of the user's own complaints.
  useEffect(() => {
    let cancelled = false

    const params = { page, limit: PAGE_SIZE }
    if (statusFilter) params.status = statusFilter

    complaintService
      .list(params)
      .then((res) => {
        if (cancelled) return
        setComplaints(res.data.complaints)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
        setError('')
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
  }, [statusFilter, page, refreshKey])

  // Donations the complaint may be linked to (own donations only).
  useEffect(() => {
    let cancelled = false
    const loader = user?.role === 'organization' ? organizationService : donationService

    loader
      .list({ limit: 50 })
      .then((res) => {
        if (!cancelled) setDonations(res.data.donations || [])
      })
      .catch(() => {
        if (!cancelled) setDonations([])
      })

    return () => {
      cancelled = true
    }
  }, [user?.role])

  // Details for ?id=...
  useEffect(() => {
    if (!selectedId) return undefined

    let cancelled = false
    complaintService
      .getById(selectedId)
      .then((res) => {
        if (!cancelled) {
          setDetail({ id: selectedId, complaint: res.data.complaint, error: '' })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail({
            id: selectedId,
            complaint: null,
            error:
              err.response?.status === 404
                ? 'This complaint does not exist or does not belong to you.'
                : getApiErrorMessage(err, 'Unable to load this complaint.'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedId])

  function openDetail(id) {
    setError('')
    setActionError('')
    setSearchParams({ id })
  }

  function closeDetail() {
    setDetail({ id: '', complaint: null, error: '' })
    setError('')
    setSearchParams({})
  }

  async function handleCreate(event) {
    event.preventDefault()
    setActionError('')
    setSuccessMessage('')

    const subject = form.subject.trim()
    const description = form.description.trim()

    if (subject.length < 5 || subject.length > 150) {
      setActionError('Subject must be between 5 and 150 characters.')
      return
    }
    if (description.length < 20 || description.length > 2000) {
      setActionError('Description must be between 20 and 2000 characters.')
      return
    }

    setSaving(true)
    try {
      const payload = { subject, description }
      if (form.donation) payload.donation = form.donation

      await complaintService.create(payload)
      setForm({ subject: '', description: '', donation: '' })
      setSuccessMessage('Complaint submitted. An admin will review it soon.')
      setPage(1)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to submit the complaint.'))
    } finally {
      setSaving(false)
    }
  }

  // ---------- Detail view ----------
  if (selectedId) {
    if (detailLoading) return <LoadingSpinner label="Loading complaint..." />

    if (!selected) {
      return (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2">{detailError || 'This complaint does not exist.'}</p>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={closeDetail}>
            Back to my complaints
          </button>
        </div>
      )
    }

    return (
      <>
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
          <div>
            <h1 className="h4 mb-1">{selected.subject}</h1>
            <p className="text-muted small mb-0">
              Raised on {new Date(selected.createdAt).toLocaleString()}
            </p>
          </div>
          <button type="button" className="btn btn-outline-secondary" onClick={closeDetail}>
            Back to my complaints
          </button>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 text-uppercase text-muted mb-3">Description</h2>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {selected.description}
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 text-uppercase text-muted mb-3">Status</h2>
                <dl className="row mb-0">
                  <dt className="col-5">Current status</dt>
                  <dd className="col-7">
                    <StatusBadge status={selected.status} />
                  </dd>
                  <dt className="col-5">Linked donation</dt>
                  <dd className="col-7">
                    {selected.donation ? (
                      <Link to={`${DASHBOARD_PATHS[user?.role] || ''}/donations/${selected.donation._id}`}>
                        #{selected.donation._id.slice(-6)}
                      </Link>
                    ) : (
                      'Not linked'
                    )}
                  </dd>
                  <dt className="col-5">Last updated</dt>
                  <dd className="col-7">{new Date(selected.updatedAt).toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">Admin response</h2>
            {selected.adminResponse ? (
              <>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selected.adminResponse}</p>
                <p className="small text-muted mb-0">
                  Answered by {selected.respondedBy?.name || 'an admin'}
                </p>
              </>
            ) : (
              <p className="text-muted mb-0">
                No response yet. An admin will reply once the complaint is reviewed.
              </p>
            )}
          </div>
        </div>
      </>
    )
  }

  // ---------- List + create form ----------
  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">My Complaints</h1>
          <p className="text-muted small mb-0">
            Report a problem with a donation, pickup or interaction.
          </p>
        </div>
        <Link to={DASHBOARD_PATHS[user?.role] || '/'} className="btn btn-outline-secondary">
          Back to dashboard
        </Link>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}
      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Raise a complaint</h2>
          <form onSubmit={handleCreate}>
            <div className="mb-3">
              <label htmlFor="complaint-subject" className="form-label">
                Subject
              </label>
              <input
                id="complaint-subject"
                className="form-control"
                maxLength={150}
                required
                placeholder="Short summary of the issue"
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="complaint-description" className="form-label">
                Description
              </label>
              <textarea
                id="complaint-description"
                className="form-control"
                rows={4}
                maxLength={2000}
                required
                placeholder="Explain what happened (at least 20 characters)"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="mb-3">
              <label htmlFor="complaint-donation" className="form-label">
                Related donation <span className="text-muted">(optional)</span>
              </label>
              <select
                id="complaint-donation"
                className="form-select"
                value={form.donation}
                onChange={(event) => setForm((prev) => ({ ...prev, donation: event.target.value }))}
              >
                <option value="">No linked donation</option>
                {donations.map((donation) => (
                  <option key={donation._id} value={donation._id}>
                    {donationLabel(donation)}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit complaint'}
            </button>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-3">
            <h2 className="h6 text-uppercase text-muted mb-0">Complaint history</h2>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: '14rem' }}
              aria-label="Filter complaints by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
                setLoading(true)
                setError('')
              }}
            >
              <option value="">All statuses</option>
              {COMPLAINT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading complaints..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              title="No complaints yet"
              message="If something goes wrong with a donation or pickup, raise a complaint above and the admin team will look into it."
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Subject</th>
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
                          <StatusBadge status={complaint.status} />
                        </td>
                        <td>
                          {complaint.donation ? (
                            <Link to={`${DASHBOARD_PATHS[user?.role] || ''}/donations/${complaint.donation._id}`}>
                              #{complaint.donation._id.slice(-6)}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openDetail(complaint._id)}
                          >
                            View
                          </button>
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
