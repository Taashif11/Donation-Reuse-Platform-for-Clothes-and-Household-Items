import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import adminService from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'

// APPROVED and REJECTED are final - no further decision is possible.
const FINAL_STATUSES = ['APPROVED', 'REJECTED']

export default function AdminOrganizationDetails() {
  const { id } = useParams()

  const [organization, setOrganization] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [acting, setActing] = useState(false)

  function loadOrganization() {
    return adminService
      .getOrganization(id)
      .then((res) => {
        setOrganization(res.data.organization)
        setNotes(res.data.organization.verificationNotes || '')
        setError('')
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('This organization does not exist.')
        } else {
          setError(getApiErrorMessage(err, 'Unable to load this organization.'))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrganization()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleDecision(verificationStatus) {
    setActionError('')
    setSuccessMessage('')
    setActing(true)

    try {
      await adminService.verifyOrganization(id, {
        verificationStatus,
        verificationNotes: notes,
      })
      setSuccessMessage(`Organization marked as ${verificationStatus}.`)
      await loadOrganization()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to update the verification status.'))
    } finally {
      setActing(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading organization..." />

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{error}</p>
        <Link to="/admin/organizations" className="btn btn-sm btn-outline-danger">
          Back to organizations
        </Link>
      </div>
    )
  }

  const details = organization.verificationDetails || {}
  const documents = organization.verificationDocuments || []
  const isFinal = FINAL_STATUSES.includes(organization.verificationStatus)

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">{organization.organizationName}</h1>
          <p className="text-muted small mb-0 text-capitalize">
            {organization.organizationType} - {organization.city || 'city not set'}
          </p>
        </div>
        <Link to="/admin/organizations" className="btn btn-outline-secondary">
          Back to organizations
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
              <h2 className="h6 text-uppercase text-muted mb-3">Organization profile</h2>
              <dl className="row mb-0">
                <dt className="col-sm-4">Contact person</dt>
                <dd className="col-sm-8">{organization.contactPerson || '-'}</dd>
                <dt className="col-sm-4">Email</dt>
                <dd className="col-sm-8">{organization.email || '-'}</dd>
                <dt className="col-sm-4">Phone</dt>
                <dd className="col-sm-8">{organization.phone || '-'}</dd>
                <dt className="col-sm-4">Address</dt>
                <dd className="col-sm-8">
                  {organization.address || '-'}
                  <br />
                  {organization.city || ''} {organization.state || ''} {organization.pincode || ''}
                </dd>
                <dt className="col-sm-4">Description</dt>
                <dd className="col-sm-8">{organization.description || '-'}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Account</h2>
              <dl className="row mb-0">
                <dt className="col-5">Registered by</dt>
                <dd className="col-7">{organization.user?.name || '-'}</dd>
                <dt className="col-5">Login email</dt>
                <dd className="col-7">{organization.user?.email || '-'}</dd>
                <dt className="col-5">Account status</dt>
                <dd className="col-7">
                  <span
                    className={`badge ${
                      organization.user?.isActive === false
                        ? 'text-bg-danger'
                        : 'text-bg-success'
                    }`}
                  >
                    {organization.user?.isActive === false ? 'Deactivated' : 'Active'}
                  </span>
                </dd>
                <dt className="col-5">Member since</dt>
                <dd className="col-7">
                  {organization.user?.createdAt
                    ? new Date(organization.user.createdAt).toLocaleDateString()
                    : '-'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Verification details</h2>
              <dl className="row mb-0">
                <dt className="col-sm-4">Registration number</dt>
                <dd className="col-sm-8">{details.registrationNumber || '-'}</dd>
                <dt className="col-sm-4">Website</dt>
                <dd className="col-sm-8">{details.website || '-'}</dd>
                <dt className="col-sm-4">Established</dt>
                <dd className="col-sm-8">{details.establishedYear || '-'}</dd>
                <dt className="col-sm-4">Documents</dt>
                <dd className="col-sm-8">
                  {documents.length === 0
                    ? 'No documents submitted'
                    : documents.map((doc) => (
                        <div key={doc.url || doc.name}>
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noreferrer">
                              {doc.name || doc.url}
                            </a>
                          ) : (
                            doc.name
                          )}
                        </div>
                      ))}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Current decision</h2>
              <p className="mb-2">
                Status: <StatusBadge status={organization.verificationStatus} />
              </p>
              <p className="small text-muted mb-1">
                Last decided by: {organization.verifiedBy?.name || '-'}
              </p>
              <p className="small text-muted mb-0">
                Decided at:{' '}
                {organization.verifiedAt
                  ? new Date(organization.verifiedAt).toLocaleString()
                  : '-'}
              </p>
              <hr />
              <p className="small text-muted mb-2">Notes on file:</p>
              <p className="small mb-0">{organization.verificationNotes || 'No notes yet.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Make a decision</h2>

          {isFinal ? (
            <div className="alert alert-secondary mb-0" role="status">
              This organization has been finalized as{' '}
              <strong>{organization.verificationStatus}</strong>. No further verification is
              allowed.
            </div>
          ) : (
            <>
              <label htmlFor="verify-notes" className="form-label">
                Verification notes
              </label>
              <textarea
                id="verify-notes"
                className="form-control mb-3"
                rows={3}
                maxLength={500}
                placeholder="Explain the decision or ask for more information (optional)."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={acting}
                  onClick={() => handleDecision('APPROVED')}
                >
                  {acting ? 'Saving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={acting}
                  onClick={() => handleDecision('REJECTED')}
                >
                  {acting ? 'Saving...' : 'Reject'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-warning"
                  disabled={acting}
                  onClick={() => handleDecision('NEEDS_MORE_INFO')}
                >
                  {acting ? 'Saving...' : 'Request more info'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
