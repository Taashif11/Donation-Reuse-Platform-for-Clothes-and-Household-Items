import { useEffect, useState } from 'react'
import organizationService from '../../services/organizationService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import MapPreview from '../../components/MapPreview'

const ORGANIZATION_TYPES = ['ngo', 'orphanage', 'beneficiary', 'shelter', 'other']

const VERIFICATION_MESSAGES = {
  PENDING: 'Your profile is waiting for admin verification. Donors cannot see your organization until it is approved.',
  APPROVED: 'Your organization is verified and visible in the public directory.',
  REJECTED: 'Verification was rejected. Update your details and ask the admin to review again.',
  NEEDS_MORE_INFO: 'The admin asked for more information. Update your profile and verification details.',
}

const EMPTY_FORM = {
  organizationName: '',
  organizationType: 'ngo',
  description: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  registrationNumber: '',
  website: '',
  establishedYear: '',
}

export default function OrgProfile() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    organizationService
      .getMyProfile()
      .then((res) => {
        const org = res.data.organization
        setOrganization(org)
        setForm({
          organizationName: org.organizationName || '',
          organizationType: org.organizationType || 'ngo',
          description: org.description || '',
          contactPerson: org.contactPerson || '',
          email: org.email || '',
          phone: org.phone || '',
          address: org.address || '',
          city: org.city || '',
          state: org.state || '',
          pincode: org.pincode || '',
          registrationNumber: org.verificationDetails?.registrationNumber || '',
          website: org.verificationDetails?.website || '',
          establishedYear: org.verificationDetails?.establishedYear
            ? String(org.verificationDetails.establishedYear)
            : '',
        })
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load your organization profile.')))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const nextErrors = {}
    if (form.organizationName.trim().length < 2 || form.organizationName.trim().length > 120) {
      nextErrors.organizationName = 'Organization name must be between 2 and 120 characters.'
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (form.establishedYear && !/^\d{4}$/.test(form.establishedYear.trim())) {
      nextErrors.establishedYear = 'Enter a four digit year, for example 2011.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    const payload = {
      organizationName: form.organizationName.trim(),
      organizationType: form.organizationType,
      description: form.description.trim(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      registrationNumber: form.registrationNumber.trim(),
      website: form.website.trim(),
      establishedYear: form.establishedYear ? Number(form.establishedYear) : null,
    }

    setSaving(true)
    try {
      await organizationService.updateMyProfile(payload)
      // Re-fetch so the geocoded location (added server-side in Phase 12)
      // comes back populated for the map preview.
      const refreshed = await organizationService.getMyProfile()
      setOrganization(refreshed.data.organization)
      setSuccess('Organization profile updated successfully.')
    } catch (err) {
      const apiErrors = err.response?.data?.errors
      if (Array.isArray(apiErrors)) {
        const mapped = {}
        for (const item of apiErrors) {
          if (item.field) mapped[item.field] = item.message
        }
        setFieldErrors(mapped)
      }
      setError(getApiErrorMessage(err, 'Unable to update your organization profile.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading your organization profile..." />

  const verification = organization?.verificationStatus || 'PENDING'

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Organization profile</h1>
          <p className="text-muted small mb-0">
            Details donors see in the public directory once you are verified.
          </p>
        </div>
        <span
          className={`badge ${
            verification === 'APPROVED'
              ? 'text-bg-success'
              : verification === 'REJECTED'
                ? 'text-bg-danger'
                : 'text-bg-warning text-dark'
          }`}
        >
          {verification.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="alert alert-secondary" role="status">
        {VERIFICATION_MESSAGES[verification] || VERIFICATION_MESSAGES.PENDING}
        {organization?.verificationNotes && (
          <p className="mb-0 mt-2 small">
            <strong>Admin note:</strong> {organization.verificationNotes}
          </p>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">Organization details</h2>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="org-name">
                  Organization name <span className="text-danger">*</span>
                </label>
                <input
                  id="org-name"
                  name="organizationName"
                  type="text"
                  maxLength="120"
                  className={`form-control ${fieldErrors.organizationName ? 'is-invalid' : ''}`}
                  value={form.organizationName}
                  onChange={handleChange}
                />
                {fieldErrors.organizationName && (
                  <div className="invalid-feedback">{fieldErrors.organizationName}</div>
                )}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="org-type">
                  Organization type
                </label>
                <select
                  id="org-type"
                  name="organizationType"
                  className="form-select"
                  value={form.organizationType}
                  onChange={handleChange}
                >
                  {ORGANIZATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="org-description">
                  Description
                </label>
                <textarea
                  id="org-description"
                  name="description"
                  rows="3"
                  maxLength="1000"
                  className="form-control"
                  placeholder="Who you help and what kind of items you can accept"
                  value={form.description}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="org-contact">
                  Contact person
                </label>
                <input
                  id="org-contact"
                  name="contactPerson"
                  type="text"
                  maxLength="80"
                  className="form-control"
                  value={form.contactPerson}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="org-email">
                  Public email
                </label>
                <input
                  id="org-email"
                  name="email"
                  type="email"
                  className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                />
                {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="org-phone">
                  Phone
                </label>
                <input
                  id="org-phone"
                  name="phone"
                  type="tel"
                  maxLength="15"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="org-website">
                  Website
                </label>
                <input
                  id="org-website"
                  name="website"
                  type="text"
                  maxLength="200"
                  className="form-control"
                  placeholder="https://example.org"
                  value={form.website}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">Address</h2>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="org-address">
                  Street address
                </label>
                <input
                  id="org-address"
                  name="address"
                  type="text"
                  maxLength="200"
                  className="form-control"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="org-city">
                  City
                </label>
                <input
                  id="org-city"
                  name="city"
                  type="text"
                  maxLength="60"
                  className="form-control"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="org-state">
                  State
                </label>
                <input
                  id="org-state"
                  name="state"
                  type="text"
                  maxLength="60"
                  className="form-control"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="org-pincode">
                  Pincode
                </label>
                <input
                  id="org-pincode"
                  name="pincode"
                  type="text"
                  maxLength="10"
                  className={`form-control ${fieldErrors.pincode ? 'is-invalid' : ''}`}
                  value={form.pincode}
                  onChange={handleChange}
                />
                {fieldErrors.pincode && (
                  <div className="invalid-feedback">{fieldErrors.pincode}</div>
                )}
              </div>

              {/* Phase 12: map of the geocoded address (appears after the
                  first save that includes the full address). */}
              <div className="col-12">
                <MapPreview
                  location={organization?.location}
                  height={200}
                  label="Organization location"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">Verification details</h2>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="org-reg">
                  Registration number
                </label>
                <input
                  id="org-reg"
                  name="registrationNumber"
                  type="text"
                  maxLength="80"
                  className="form-control"
                  value={form.registrationNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="org-year">
                  Year established
                </label>
                <input
                  id="org-year"
                  name="establishedYear"
                  type="text"
                  maxLength="4"
                  className={`form-control ${fieldErrors.establishedYear ? 'is-invalid' : ''}`}
                  placeholder="2011"
                  value={form.establishedYear}
                  onChange={handleChange}
                />
                {fieldErrors.establishedYear && (
                  <div className="invalid-feedback">{fieldErrors.establishedYear}</div>
                )}
              </div>

              <div className="col-12">
                <p className="text-muted small mb-0">
                  Registration documents are uploaded during the admin verification step.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-success" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </form>
    </>
  )
}
