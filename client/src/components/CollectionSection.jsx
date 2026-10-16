import { useEffect, useState } from 'react'
import collectionService from '../services/collectionService'
import { getApiErrorMessage } from '../utils/validation'
import { COLLECTION_NEXT_ACTIONS } from '../utils/constants'
import StatusBadge from './StatusBadge'

const TIME_SLOTS = ['10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', 'Any time']

const STEP_LABELS = {
  PICKED_UP: 'Mark as picked up',
  RECEIVED: 'Mark as received',
  DISTRIBUTED: 'Mark as distributed',
}

// Schedule / reschedule / advance the doorstep pickup for one donation.
// Used by both the donor and the organization donation details pages.
export default function CollectionSection({ donation, role, onUpdated }) {
  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [working, setWorking] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    scheduledDate: '',
    scheduledTime: TIME_SLOTS[0],
    address: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState({})

  function loadCollection() {
    return collectionService
      .list({ donation: donation._id, limit: 1 })
      .then((res) => setCollection(res.data.collections[0] || null))
      .catch((err) => setActionError(getApiErrorMessage(err, 'Unable to load the collection.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    loadCollection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donation._id])

  // Prefill the form from the donation / existing collection.
  function openForm() {
    setForm({
      scheduledDate: collection?.scheduledDate
        ? new Date(collection.scheduledDate).toISOString().slice(0, 10)
        : donation.scheduledDate
          ? new Date(donation.scheduledDate).toISOString().slice(0, 10)
          : '',
      scheduledTime: collection?.scheduledTime || donation.scheduledTime || TIME_SLOTS[0],
      address: collection?.address || donation.pickupAddress || '',
      notes: collection?.notes || '',
    })
    setFormErrors({})
    setActionError('')
    setShowForm(true)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const next = {}
    if (!form.scheduledDate) next.scheduledDate = 'Pickup date is required.'
    else if (form.scheduledDate < today) next.scheduledDate = 'Pickup date cannot be in the past.'
    if (!form.scheduledTime) next.scheduledTime = 'Pick a time slot.'
    if (form.address.trim().length < 5) {
      next.address = 'Enter a complete pickup address (at least 5 characters).'
    }
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setActionError('')

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    const payload = {
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      address: form.address.trim(),
      notes: form.notes.trim(),
    }

    setWorking(true)
    try {
      if (collection) {
        await collectionService.reschedule(collection._id, payload)
      } else {
        await collectionService.create({ ...payload, donation: donation._id })
      }
      setShowForm(false)
      await loadCollection()
      onUpdated?.()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to save the pickup schedule.'))
    } finally {
      setWorking(false)
    }
  }

  async function handleAdvance() {
    const nextStep = COLLECTION_NEXT_ACTIONS[collection.status]
    if (!nextStep) return

    setActionError('')
    setWorking(true)
    try {
      await collectionService.updateStatus(collection._id, { status: nextStep })
      await loadCollection()
      onUpdated?.()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to update the collection status.'))
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body text-muted small">Loading collection details...</div>
      </div>
    )
  }

  if (donation.status === 'CANCELLED' || donation.status === 'REJECTED') return null

  const nextStep = collection ? COLLECTION_NEXT_ACTIONS[collection.status] : null
  const canAdvance = role === 'organization' && nextStep && !working
  const showSummary = collection && !showForm

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h6 text-uppercase text-muted mb-0">Collection</h2>
          {collection && <StatusBadge status={collection.status} />}
        </div>

        {actionError && (
          <div className="alert alert-danger py-2" role="alert">
            {actionError}
          </div>
        )}

        {/* Not accepted yet - a pickup cannot be scheduled. */}
        {!collection && donation.status === 'PENDING' && (
          <p className="text-muted small mb-0">
            The organization has not accepted this request yet. A pickup can be scheduled as
            soon as the donation is accepted.
          </p>
        )}

        {/* Accepted - schedule the pickup. */}
        {!collection && donation.status === 'ACCEPTED' && !showForm && (
          <>
            <p className="text-muted small">
              Choose a date and time slot for the doorstep pickup of these items.
            </p>
            <button type="button" className="btn btn-success btn-sm" onClick={openForm}>
              Schedule collection
            </button>
          </>
        )}

        {/* Existing collection - summary + actions. */}
        {showSummary && (
          <>
            <dl className="row small mb-3">
              <dt className="col-12 col-sm-4 col-md-3 mb-1 mb-sm-0">Date</dt>
              <dd className="col-12 col-sm-8 col-md-9">
                {new Date(collection.scheduledDate).toLocaleDateString()}
              </dd>
              <dt className="col-12 col-sm-4 col-md-3 mb-1 mb-sm-0">Time slot</dt>
              <dd className="col-12 col-sm-8 col-md-9">{collection.scheduledTime}</dd>
              <dt className="col-12 col-sm-4 col-md-3 mb-1 mb-sm-0">Pickup address</dt>
              <dd className="col-12 col-sm-8 col-md-9">{collection.address}</dd>
              {collection.notes && (
                <>
                  <dt className="col-12 col-sm-4 col-md-3 mb-1 mb-sm-0">Notes</dt>
                  <dd className="col-12 col-sm-8 col-md-9">{collection.notes}</dd>
                </>
              )}
            </dl>

            <div className="d-flex flex-wrap gap-2">
              {collection.status === 'SCHEDULED' && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={openForm}
                  disabled={working}
                >
                  Reschedule
                </button>
              )}
              {canAdvance && (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleAdvance}
                  disabled={working}
                >
                  {working ? 'Updating...' : STEP_LABELS[nextStep]}
                </button>
              )}
              {collection.status === 'DISTRIBUTED' && (
                <span className="text-success small align-self-center">
                  Collection completed - items were distributed.
                </span>
              )}
              {role === 'donor' && collection.status !== 'DISTRIBUTED' && (
                <span className="text-muted small align-self-center">
                  The organization updates the status after each step.
                </span>
              )}
            </div>
          </>
        )}

        {/* Schedule / reschedule form. */}
        {showForm && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="collection-date" className="form-label">
                  Pickup date <span className="text-danger">*</span>
                </label>
                <input
                  id="collection-date"
                  name="scheduledDate"
                  type="date"
                  min={today}
                  className={`form-control ${formErrors.scheduledDate ? 'is-invalid' : ''}`}
                  value={form.scheduledDate}
                  onChange={handleChange}
                />
                {formErrors.scheduledDate && (
                  <div className="invalid-feedback">{formErrors.scheduledDate}</div>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="collection-time" className="form-label">
                  Time slot <span className="text-danger">*</span>
                </label>
                <select
                  id="collection-time"
                  name="scheduledTime"
                  className={`form-select ${formErrors.scheduledTime ? 'is-invalid' : ''}`}
                  value={form.scheduledTime}
                  onChange={handleChange}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {formErrors.scheduledTime && (
                  <div className="invalid-feedback">{formErrors.scheduledTime}</div>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="collection-address" className="form-label">
                  Pickup address <span className="text-danger">*</span>
                </label>
                <textarea
                  id="collection-address"
                  name="address"
                  rows="2"
                  className={`form-control ${formErrors.address ? 'is-invalid' : ''}`}
                  placeholder="House number, street, area, city, pincode"
                  value={form.address}
                  onChange={handleChange}
                ></textarea>
                {formErrors.address && (
                  <div className="invalid-feedback">{formErrors.address}</div>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="collection-notes" className="form-label">
                  Pickup notes (optional)
                </label>
                <textarea
                  id="collection-notes"
                  name="notes"
                  rows="2"
                  maxLength="500"
                  className="form-control"
                  placeholder="Landmark, gate code or anything the volunteer should know"
                  value={form.notes}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="col-12 d-flex flex-wrap gap-2">
                <button type="submit" className="btn btn-success btn-sm" disabled={working}>
                  {working ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      Saving...
                    </>
                  ) : collection ? (
                    'Save new schedule'
                  ) : (
                    'Confirm collection'
                  )}
                </button>
                {collection && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowForm(false)}
                    disabled={working}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
