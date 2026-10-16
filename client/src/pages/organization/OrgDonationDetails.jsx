import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import organizationService from '../../services/organizationService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import DonationProgress from '../../components/DonationProgress'
import CollectionSection from '../../components/CollectionSection'
import MapPreview from '../../components/MapPreview'

export default function OrgDonationDetails() {
  const { id } = useParams()

  const [donation, setDonation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [acting, setActing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Reloads the donation after a schedule/status change elsewhere on the page.
  function loadDonation() {
    return organizationService
      .getDonation(id)
      .then((res) => {
        setDonation(res.data.donation)
        setError('')
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError(
            'This donation request does not exist or does not belong to your organization.'
          )
        } else {
          setError(getApiErrorMessage(err, 'Unable to load this donation request.'))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    loadDonation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleStatus(status) {
    setActionError('')
    setActing(true)

    const payload = { status }
    if (status === 'REJECTED') payload.rejectionReason = rejectionReason.trim()

    organizationService
      .updateDonationStatus(id, payload)
      .then((res) => {
        setDonation(res.data.donation)
        setRejecting(false)
        setRejectionReason('')
      })
      .catch((err) => setActionError(getApiErrorMessage(err, 'Unable to update this request.')))
      .finally(() => setActing(false))
  }

  if (loading) return <LoadingSpinner label="Loading donation request..." />

  if (error) {
    return (
      <>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <Link to="/organization/requests" className="btn btn-outline-secondary btn-sm">
          Back to requests
        </Link>
      </>
    )
  }

  const isPending = donation.status === 'PENDING'
  const totalQuantity = (donation.items || []).reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  )

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="h4 mb-0">Donation request</h1>
            <StatusBadge status={donation.status} />
          </div>
          <p className="text-muted small mb-0 mt-1">
            Received {new Date(donation.createdAt).toLocaleString()} - Ref{' '}
            <code>{donation._id}</code>
          </p>
        </div>
        <Link to="/organization/requests" className="btn btn-outline-secondary btn-sm">
          Back to requests
        </Link>
      </div>

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      {donation.status === 'REJECTED' && (
        <div className="alert alert-danger" role="status">
          <strong>You rejected this request.</strong>
          {donation.rejectionReason ? ` Reason: ${donation.rejectionReason}` : ''}
        </div>
      )}

      {donation.status === 'CANCELLED' && (
        <div className="alert alert-warning" role="status">
          <strong>The donor cancelled this request.</strong>
          {donation.cancellationReason ? ` Reason: ${donation.cancellationReason}` : ''}
        </div>
      )}

      {isPending && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">Your decision</h2>

            {!rejecting ? (
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleStatus('ACCEPTED')}
                  disabled={acting}
                >
                  {acting ? 'Working...' : 'Accept request'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setRejecting(true)}
                  disabled={acting}
                >
                  Reject request
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="reject-reason" className="form-label">
                  Reason for rejecting (optional)
                </label>
                <textarea
                  id="reject-reason"
                  rows="3"
                  maxLength="300"
                  className="form-control mb-3"
                  placeholder="For example: we already have enough winter clothes this month"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                ></textarea>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleStatus('REJECTED')}
                    disabled={acting}
                  >
                    {acting ? 'Rejecting...' : 'Confirm rejection'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setRejecting(false)
                      setRejectionReason('')
                      setActionError('')
                    }}
                    disabled={acting}
                  >
                    Keep reviewing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CollectionSection donation={donation} role="organization" onUpdated={loadDonation} />

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Donation tracking</h2>
          <DonationProgress donation={donation} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Donor</h2>
              <h3 className="h6 mb-1">{donation.donor?.name || '-'}</h3>
              {donation.donor?.phone && (
                <p className="small mb-1">
                  <a href={`tel:${donation.donor.phone}`}>{donation.donor.phone}</a>
                </p>
              )}
              {donation.donor?.email && (
                <p className="small mb-0">
                  <a href={`mailto:${donation.donor.email}`}>{donation.donor.email}</a>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Pickup details</h2>
              <dl className="row small mb-3">
                <dt className="col-5">Address</dt>
                <dd className="col-7">{donation.pickupAddress}</dd>
                <dt className="col-5">Date</dt>
                <dd className="col-7">
                  {donation.scheduledDate
                    ? new Date(donation.scheduledDate).toLocaleDateString()
                    : 'Not scheduled'}
                </dd>
                <dt className="col-5">Time</dt>
                <dd className="col-7">{donation.scheduledTime || '-'}</dd>
                <dt className="col-5">Notes</dt>
                <dd className="col-7">{donation.notes || '-'}</dd>
              </dl>
              {/* Phase 12: map of the geocoded pickup point (if available). */}
              <MapPreview
                location={donation.pickupLocation}
                height={200}
                label="Pickup location"
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 text-uppercase text-muted mb-0">Items offered</h2>
                <span className="small text-muted">{totalQuantity} total quantity</span>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col">Item</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Condition</th>
                      <th scope="col">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(donation.items || []).map((item) => (
                      <tr key={item._id}>
                        <td>{item.category?.name || '-'}</td>
                        <td>{item.itemType || '-'}</td>
                        <td>{item.quantity}</td>
                        <td>{item.condition}</td>
                        <td>{item.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
