import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import donationService from '../../services/donationService'
import { getApiErrorMessage } from '../../utils/validation'
import { CANCELLABLE_STATUSES } from '../../utils/constants'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import DonationProgress from '../../components/DonationProgress'
import CollectionSection from '../../components/CollectionSection'
import MapPreview from '../../components/MapPreview'

export default function DonationDetails() {
  const { id } = useParams()

  const [donation, setDonation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Reloads the donation after a schedule/status change elsewhere on the page.
  function loadDonation() {
    return donationService
      .getById(id)
      .then((res) => {
        setDonation(res.data.donation)
        setError('')
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('This donation does not exist or does not belong to your account.')
        } else {
          setError(getApiErrorMessage(err, 'Unable to load this donation.'))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    loadDonation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleCancel() {
    const confirmed = window.confirm(
      'Cancel this donation request? This cannot be undone.'
    )
    if (!confirmed) return

    setCancelling(true)
    donationService
      .updateStatus(id, { status: 'CANCELLED', cancellationReason: 'Cancelled by donor' })
      .then((res) => setDonation(res.data.donation))
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to cancel this donation.')))
      .finally(() => setCancelling(false))
  }

  if (loading) return <LoadingSpinner label="Loading donation..." />

  if (error) {
    return (
      <>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <Link to="/donor/history" className="btn btn-outline-secondary btn-sm">
          Back to history
        </Link>
      </>
    )
  }

  const canCancel = CANCELLABLE_STATUSES.includes(donation.status)
  const totalQuantity = (donation.items || []).reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  )

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="h4 mb-0">Donation details</h1>
            <StatusBadge status={donation.status} />
          </div>
          <p className="text-muted small mb-0 mt-1">
            Created {new Date(donation.createdAt).toLocaleString()} - Ref{' '}
            <code>{donation._id}</code>
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/donor/history" className="btn btn-outline-secondary btn-sm">
            Back to history
          </Link>
          {canCancel && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel donation'}
            </button>
          )}
        </div>
      </div>

      {donation.status === 'CANCELLED' && (
        <div className="alert alert-danger" role="status">
          <strong>This donation was cancelled.</strong>
          {donation.cancellationReason ? ` Reason: ${donation.cancellationReason}` : ''}
        </div>
      )}

      {donation.status === 'REJECTED' && (
        <div className="alert alert-warning" role="status">
          <strong>The organization declined this request.</strong>
          {donation.rejectionReason ? ` Reason: ${donation.rejectionReason}` : ''} You can
          create a new donation and choose a different organization.
        </div>
      )}

      <CollectionSection donation={donation} role="donor" onUpdated={loadDonation} />

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
              <h2 className="h6 text-uppercase text-muted mb-3">Organization</h2>
              <h3 className="h6 mb-1">
                {donation.organization?.organizationName || '-'}
              </h3>
              <p className="small text-muted mb-1">
                {donation.organization?.city}
                {donation.organization?.organizationType
                  ? ` - ${donation.organization.organizationType}`
                  : ''}
              </p>
              {donation.organization?.email && (
                <p className="small mb-0">
                  <a href={`mailto:${donation.organization.email}`}>
                    {donation.organization.email}
                  </a>
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
                <h2 className="h6 text-uppercase text-muted mb-0">Items</h2>
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
