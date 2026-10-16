import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import complaintService from '../../services/complaintService'
import { getApiErrorMessage } from '../../utils/validation'
import { COMPLAINT_NEXT_ACTIONS } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'

// Admin detail screen: read the complaint, move it through the workflow and
// reply to the complainant.
export default function AdminComplaintDetails() {
  const { id } = useParams()

  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [nextStatus, setNextStatus] = useState('')
  const [adminResponse, setAdminResponse] = useState('')

  function loadComplaint() {
    return complaintService
      .adminGetById(id)
      .then((res) => {
        setComplaint(res.data.complaint)
        setError('')
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('This complaint does not exist.')
        } else {
          setError(getApiErrorMessage(err, 'Unable to load this complaint.'))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadComplaint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatusUpdate(event) {
    event.preventDefault()
    setActionError('')
    setSuccessMessage('')

    if (!nextStatus) {
      setActionError('Choose the next status first.')
      return
    }

    const responseText = adminResponse.trim()
    if (nextStatus === 'RESOLVED' && responseText.length < 5) {
      setActionError('An admin response is required to resolve a complaint.')
      return
    }
    if (responseText && responseText.length < 5) {
      setActionError('Admin response must be at least 5 characters.')
      return
    }

    setSaving(true)
    try {
      const payload = { status: nextStatus }
      if (responseText) payload.adminResponse = responseText

      await complaintService.adminUpdateStatus(id, payload)
      setSuccessMessage(`Complaint moved to ${nextStatus.replace('_', ' ')}.`)
      setNextStatus('')
      setAdminResponse('')
      await loadComplaint()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to update the complaint status.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading complaint..." />

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{error}</p>
        <Link to="/admin/complaints" className="btn btn-sm btn-outline-danger">
          Back to complaints
        </Link>
      </div>
    )
  }

  const allowedNext = COMPLAINT_NEXT_ACTIONS[complaint.status] || []
  const isClosed = allowedNext.length === 0

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">{complaint.subject}</h1>
          <p className="text-muted small mb-0">
            Raised by {complaint.user?.name || 'a user'} on{' '}
            {new Date(complaint.createdAt).toLocaleString()}
          </p>
        </div>
        <Link to="/admin/complaints" className="btn btn-outline-secondary">
          Back to complaints
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

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Complaint</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Details</h2>
              <dl className="row mb-0">
                <dt className="col-5">Status</dt>
                <dd className="col-7">
                  <StatusBadge status={complaint.status} />
                </dd>
                <dt className="col-5">Raised by</dt>
                <dd className="col-7">
                  {complaint.user?.name || '-'}
                  <div className="small text-muted">{complaint.user?.email || '-'}</div>
                </dd>
                <dt className="col-5">Phone</dt>
                <dd className="col-7">{complaint.user?.phone || '-'}</dd>
                <dt className="col-5">Linked donation</dt>
                <dd className="col-7">
                  {complaint.donation ? `#${complaint.donation._id.slice(-6)}` : 'Not linked'}
                </dd>
                <dt className="col-5">Last updated</dt>
                <dd className="col-7">{new Date(complaint.updatedAt).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Current response</h2>
          {complaint.adminResponse ? (
            <>
              <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                {complaint.adminResponse}
              </p>
              <p className="small text-muted mb-0">
                Sent by {complaint.respondedBy?.name || 'an admin'}
              </p>
            </>
          ) : (
            <p className="text-muted mb-0">No response has been sent yet.</p>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Update complaint</h2>

          {isClosed ? (
            <div className="alert alert-secondary mb-0" role="status">
              This complaint is <strong>CLOSED</strong> and can no longer be updated.
            </div>
          ) : (
            <form onSubmit={handleStatusUpdate}>
              <div className="mb-3">
                <label htmlFor="complaint-next-status" className="form-label">
                  Move to
                </label>
                <select
                  id="complaint-next-status"
                  className="form-select"
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value)}
                >
                  <option value="">Choose a status</option>
                  {allowedNext.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  Current status: {complaint.status.replace('_', ' ')} - allowed next:{' '}
                  {allowedNext.map((status) => status.replace('_', ' ')).join(', ')}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="complaint-response" className="form-label">
                  Admin response{' '}
                  <span className="text-muted">(required when resolving)</span>
                </label>
                <textarea
                  id="complaint-response"
                  className="form-control"
                  rows={4}
                  maxLength={2000}
                  placeholder="Explain the decision or the action taken"
                  value={adminResponse}
                  onChange={(event) => setAdminResponse(event.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Saving...' : 'Update complaint'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
