import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import userService from '../../services/userService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function DonorProfile() {
  const { user, refreshUser } = useAuth()

  const [form, setForm] = useState({ name: '', phone: '', about: '' })
  // Phase 12: reusable pickup point, geocoded by the server for the map.
  const [location, setLocation] = useState({
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    userService
      .getMe()
      .then((res) => {
        const me = res.data.user
        setForm({
          name: me.name || '',
          phone: me.phone || '',
          about: res.data.donorProfile?.about || '',
        })
        const saved = res.data.donorProfile?.defaultLocation
        if (saved) {
          setLocation({
            addressLine: saved.addressLine || '',
            city: saved.city || '',
            state: saved.state || '',
            pincode: saved.pincode || '',
          })
        }
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load your profile.')))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setSuccess('')
  }

  function handleLocationChange(event) {
    const { name, value } = event.target
    setLocation((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const nextErrors = {}
    if (form.name.trim().length < 2 || form.name.trim().length > 80) {
      nextErrors.name = 'Name must be between 2 and 80 characters.'
    }
    if (form.phone && !/^\+?[0-9\s-]{7,15}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Enter a valid phone number.'
    }

    // The saved pickup point is all-or-nothing so the map always has a
    // complete address to geocode.
    const locationValues = Object.values(location).map((value) => value.trim())
    const locationFilled = locationValues.filter(Boolean).length
    if (locationFilled > 0 && locationFilled < 4) {
      nextErrors.addressLine = 'Fill in all four address fields, or leave them all empty.'
      nextErrors.city = ''
      nextErrors.state = ''
      nextErrors.pincode = ''
    }

    if (Object.keys(nextErrors).some((key) => nextErrors[key])) {
      setFieldErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        about: form.about.trim(),
      }
      if (locationFilled === 4) {
        payload.defaultLocation = {
          addressLine: location.addressLine.trim(),
          city: location.city.trim(),
          state: location.state.trim(),
          pincode: location.pincode.trim(),
        }
      }
      await userService.updateMe(payload)
      await refreshUser()
      setSuccess(
        locationFilled === 4
          ? 'Profile and pickup location updated. The address was geocoded for the map.'
          : 'Profile updated successfully.'
      )
    } catch (err) {
      const apiErrors = err.response?.data?.errors
      if (Array.isArray(apiErrors)) {
        const mapped = {}
        for (const item of apiErrors) {
          if (item.field) mapped[item.field] = item.message
        }
        setFieldErrors(mapped)
      }
      setError(getApiErrorMessage(err, 'Unable to update your profile.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading your profile..." />

  return (
    <>
      <h1 className="h4 mb-1">My profile</h1>
      <p className="text-muted small mb-4">Keep your contact details up to date so the NGO can reach you.</p>

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

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Account</h2>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                className="form-control"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="profile-role">
                Role
              </label>
              <input
                id="profile-role"
                type="text"
                className="form-control"
                value={user?.role || ''}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">Personal details</h2>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="profile-name">
                  Full name <span className="text-danger">*</span>
                </label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                  value={form.name}
                  onChange={handleChange}
                />
                {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="profile-phone">
                  Phone
                </label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange}
                />
                {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="profile-about">
                  About you (optional)
                </label>
                <textarea
                  id="profile-about"
                  name="about"
                  rows="3"
                  maxLength="300"
                  className="form-control"
                  placeholder="Tell organizations a little about yourself"
                  value={form.about}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 12: reusable pickup point - geocoded for the map and
            pre-filled when you create a donation. */}
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-1">Default pickup location</h2>
            <p className="small text-muted mb-3">
              Saved pickup addresses are geocoded so organizations can see the location on a
              map and donors nearby can find them. Fill in all four fields, or leave them
              empty to skip.
            </p>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="location-address">
                  Address line
                </label>
                <input
                  id="location-address"
                  name="addressLine"
                  type="text"
                  maxLength="200"
                  className={`form-control ${fieldErrors.addressLine ? 'is-invalid' : ''}`}
                  placeholder="22 Green Street"
                  value={location.addressLine}
                  onChange={handleLocationChange}
                />
                {fieldErrors.addressLine && (
                  <div className="invalid-feedback">{fieldErrors.addressLine}</div>
                )}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="location-city">
                  City
                </label>
                <input
                  id="location-city"
                  name="city"
                  type="text"
                  maxLength="60"
                  className={`form-control ${fieldErrors.city ? 'is-invalid' : ''}`}
                  placeholder="Chennai"
                  value={location.city}
                  onChange={handleLocationChange}
                />
                {fieldErrors.city && <div className="invalid-feedback">{fieldErrors.city}</div>}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="location-state">
                  State
                </label>
                <input
                  id="location-state"
                  name="state"
                  type="text"
                  maxLength="60"
                  className={`form-control ${fieldErrors.state ? 'is-invalid' : ''}`}
                  placeholder="Tamil Nadu"
                  value={location.state}
                  onChange={handleLocationChange}
                />
                {fieldErrors.state && (
                  <div className="invalid-feedback">{fieldErrors.state}</div>
                )}
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="location-pincode">
                  Pincode
                </label>
                <input
                  id="location-pincode"
                  name="pincode"
                  type="text"
                  maxLength="10"
                  className={`form-control ${fieldErrors.pincode ? 'is-invalid' : ''}`}
                  placeholder="600001"
                  value={location.pincode}
                  onChange={handleLocationChange}
                />
                {fieldErrors.pincode && (
                  <div className="invalid-feedback">{fieldErrors.pincode}</div>
                )}
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
