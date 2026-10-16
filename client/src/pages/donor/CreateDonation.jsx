import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import categoryService from '../../services/categoryService'
import organizationService from '../../services/organizationService'
import donationService from '../../services/donationService'
import userService from '../../services/userService'
import { getApiErrorMessage } from '../../utils/validation'

const CONDITIONS = ['New', 'Like New', 'Good', 'Usable']

const TIME_SLOTS = [
  'Any time',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
]

const INITIAL_FORM = {
  organization: '',
  pickupAddress: '',
  scheduledDate: '',
  scheduledTime: 'Any time',
  notes: '',
  category: '',
  itemType: '',
  quantity: '1',
  condition: 'Good',
  description: '',
}

export default function CreateDonation() {
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [categories, setCategories] = useState([])
  const [organizations, setOrganizations] = useState([])
  // Phase 12: the donor's saved pickup point (if any) is sent along so the
  // server can geocode the pickup address for the map.
  const [defaultLocation, setDefaultLocation] = useState(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    Promise.all([
      categoryService.getCategories(),
      organizationService.getPublicList({ limit: 50 }),
      userService.getMe().catch(() => null),
    ])
      .then(([catRes, orgRes, meRes]) => {
        setCategories(catRes.data.categories || [])
        setOrganizations(orgRes.data.organizations || [])
        setDefaultLocation(meRes?.data?.donorProfile?.defaultLocation || null)
      })
      .catch((err) => setServerError(getApiErrorMessage(err, 'Unable to load form options.')))
      .finally(() => setLoadingOptions(false))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const next = {}
    if (!form.organization) next.organization = 'Select an organization.'
    if (!form.pickupAddress.trim() || form.pickupAddress.trim().length < 5) {
      next.pickupAddress = 'Enter a complete pickup address (at least 5 characters).'
    }
    if (!form.category) next.category = 'Select a category.'
    const quantity = Number(form.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      next.quantity = 'Quantity must be a whole number between 1 and 1000.'
    }
    if (!form.condition) next.condition = 'Select the item condition.'
    if (form.scheduledDate && form.scheduledDate < today) {
      next.scheduledDate = 'Pickup date cannot be in the past.'
    }
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        organization: form.organization,
        pickupAddress: form.pickupAddress.trim(),
        scheduledDate: form.scheduledDate || undefined,
        scheduledTime: form.scheduledTime,
        notes: form.notes.trim(),
        items: [
          {
            category: form.category,
            itemType: form.itemType.trim(),
            quantity: Number(form.quantity),
            condition: form.condition,
            description: form.description.trim(),
          },
        ],
      }

      // Phase 12: pass the saved location parts so the server can geocode
      // this pickup point (map marker + nearby searches).
      if (defaultLocation) {
        payload.pickupCity = defaultLocation.city
        payload.pickupState = defaultLocation.state
        payload.pickupPincode = defaultLocation.pincode
      }

      const res = await donationService.create(payload)
      navigate(`/donor/donations/${res.data.donation._id}`)
    } catch (error) {
      const apiErrors = error.response?.data?.errors
      if (Array.isArray(apiErrors)) {
        const mapped = {}
        for (const item of apiErrors) {
          if (item.field) mapped[item.field] = item.message
        }
        setErrors(mapped)
      }
      setServerError(getApiErrorMessage(error, 'Unable to create the donation.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOptions) {
    return <div className="text-muted py-4">Loading form options...</div>
  }

  return (
    <>
      <h1 className="h4 mb-1">Create a donation</h1>
      <p className="text-muted small mb-4">
        List the items you want to give away and pick a verified organization. The request
        starts as <strong>PENDING</strong> until the organization accepts it.
      </p>

      {serverError && (
        <div className="alert alert-danger" role="alert">
          {serverError}
        </div>
      )}

      {organizations.length === 0 && (
        <div className="alert alert-info" role="status">
          No verified organizations are available yet. Donations can be created once an
          organization is approved by the admin team.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">1. Item details</h2>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="donation-category" className="form-label">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="donation-category"
                  name="category"
                  className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <div className="invalid-feedback">{errors.category}</div>}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="donation-item-type" className="form-label">
                  Item name (optional)
                </label>
                <input
                  id="donation-item-type"
                  name="itemType"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Winter jackets, Steel utensils"
                  value={form.itemType}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="donation-quantity" className="form-label">
                  Quantity <span className="text-danger">*</span>
                </label>
                <input
                  id="donation-quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  className={`form-control ${errors.quantity ? 'is-invalid' : ''}`}
                  value={form.quantity}
                  onChange={handleChange}
                />
                {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="donation-condition" className="form-label">
                  Condition <span className="text-danger">*</span>
                </label>
                <select
                  id="donation-condition"
                  name="condition"
                  className={`form-select ${errors.condition ? 'is-invalid' : ''}`}
                  value={form.condition}
                  onChange={handleChange}
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  Only clean, usable items. No torn or soiled goods, please.
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="donation-organization" className="form-label">
                  Organization <span className="text-danger">*</span>
                </label>
                <select
                  id="donation-organization"
                  name="organization"
                  className={`form-select ${errors.organization ? 'is-invalid' : ''}`}
                  value={form.organization}
                  onChange={handleChange}
                >
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.organizationName} {org.city ? `(${org.city})` : ''}
                    </option>
                  ))}
                </select>
                {errors.organization && (
                  <div className="invalid-feedback">{errors.organization}</div>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="donation-description" className="form-label">
                  Description (optional)
                </label>
                <textarea
                  id="donation-description"
                  name="description"
                  rows="2"
                  className="form-control"
                  placeholder="Anything the organization should know about these items"
                  value={form.description}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">2. Pickup details</h2>
            <div className="row g-3">
              <div className="col-12">
                <label htmlFor="donation-address" className="form-label">
                  Pickup address <span className="text-danger">*</span>
                </label>
                <textarea
                  id="donation-address"
                  name="pickupAddress"
                  rows="2"
                  className={`form-control ${errors.pickupAddress ? 'is-invalid' : ''}`}
                  placeholder="House number, street, area, city, pincode"
                  value={form.pickupAddress}
                  onChange={handleChange}
                ></textarea>
                {errors.pickupAddress && (
                  <div className="invalid-feedback">{errors.pickupAddress}</div>
                )}
                {defaultLocation && (
                  <div className="form-text">
                    Using your saved pickup location ({defaultLocation.city}) so the
                    organization can see this pickup on a map. Manage it from your{' '}
                    <Link to="/donor/profile">profile</Link>.
                  </div>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="donation-date" className="form-label">
                  Preferred pickup date (optional)
                </label>
                <input
                  id="donation-date"
                  name="scheduledDate"
                  type="date"
                  min={today}
                  className={`form-control ${errors.scheduledDate ? 'is-invalid' : ''}`}
                  value={form.scheduledDate}
                  onChange={handleChange}
                />
                {errors.scheduledDate && (
                  <div className="invalid-feedback">{errors.scheduledDate}</div>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="donation-time" className="form-label">
                  Preferred time slot (optional)
                </label>
                <select
                  id="donation-time"
                  name="scheduledTime"
                  className="form-select"
                  value={form.scheduledTime}
                  onChange={handleChange}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label htmlFor="donation-notes" className="form-label">
                  Notes for the organization (optional)
                </label>
                <textarea
                  id="donation-notes"
                  name="notes"
                  rows="2"
                  className="form-control"
                  maxLength="500"
                  value={form.notes}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-success btn-lg"
          disabled={submitting || organizations.length === 0}
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Submitting...
            </>
          ) : (
            'Submit donation request'
          )}
        </button>
      </form>
    </>
  )
}
