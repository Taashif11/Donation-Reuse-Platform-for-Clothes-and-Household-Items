import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import organizationService from '../../services/organizationService'
import locationService from '../../services/locationService'
import { getApiErrorMessage } from '../../utils/validation'

const CITIES = ['All cities', 'Chennai', 'Coimbatore', 'Madurai', 'Bengaluru', 'Hyderabad']
const RADII = [10, 25, 50, 100]

export default function BrowseNGOs() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [city, setCity] = useState('All cities')

  // Phase 12: "near me" mode uses browser geolocation + /api/locations/nearby.
  const [nearMode, setNearMode] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  function loadOrganizations() {
    setLoading(true)
    setError('')

    const params = { verificationStatus: 'verified' }
    if (city !== 'All cities') params.city = city

    organizationService
      .getPublicList(params)
      .then((res) => setOrganizations(res.data.organizations || []))
      .catch((err) => {
        setOrganizations([])
        setError(getApiErrorMessage(err, 'Unable to load organizations.'))
      })
      .finally(() => setLoading(false))
  }

  function loadNearby() {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location sharing.')
      return
    }

    setLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationService
          .nearby({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            radiusKm,
          })
          .then((res) => {
            setOrganizations(res.data.organizations || [])
            setNearMode(true)
            setError('')
          })
          .catch((err) => {
            setOrganizations([])
            setError(getApiErrorMessage(err, 'Unable to load nearby organizations.'))
          })
          .finally(() => setLocating(false))
      },
      () => {
        setLocationError(
          'Location permission was denied or is unavailable. Allow access and try again, or use the city filter.'
        )
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  function handleRadiusChange(event) {
    const next = Number(event.target.value)
    setRadiusKm(next)
    if (nearMode) {
      // Re-run the search with the new radius using the last known position.
      loadNearbyWithRadius(next)
    }
  }

  function loadNearbyWithRadius(nextRadius) {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationService
          .nearby({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            radiusKm: nextRadius,
          })
          .then((res) => setOrganizations(res.data.organizations || []))
          .catch((err) =>
            setError(getApiErrorMessage(err, 'Unable to load nearby organizations.'))
          )
          .finally(() => setLocating(false))
      },
      () => setLocating(false)
    )
  }

  function exitNearMode() {
    setNearMode(false)
    setLocationError('')
    loadOrganizations()
  }

  useEffect(() => {
    if (!nearMode) loadOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  return (
    <>
      <PageHeader
        title="Browse NGOs & beneficiaries"
        subtitle="Only organizations verified by the admin team appear in this directory."
      />

      <section className="page-section">
        <div className="container">
          <div className="row align-items-end g-3 mb-4">
            <div className="col-12 col-md-6 col-lg-4">
              <label htmlFor="city-filter" className="form-label small text-muted mb-1">
                Filter by city
              </label>
              <select
                id="city-filter"
                className="form-select"
                value={city}
                disabled={nearMode}
                onChange={(event) => setCity(event.target.value)}
              >
                {CITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <label htmlFor="radius-filter" className="form-label small text-muted mb-1">
                Search radius
              </label>
              <select
                id="radius-filter"
                className="form-select"
                value={radiusKm}
                onChange={handleRadiusChange}
              >
                {RADII.map((option) => (
                  <option key={option} value={option}>
                    Within {option} km
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-4 d-flex gap-2">
              {!nearMode ? (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={loadNearby}
                  disabled={locating}
                >
                  {locating ? 'Locating...' : 'Find NGOs near me'}
                </button>
              ) : (
                <button type="button" className="btn btn-outline-secondary" onClick={exitNearMode}>
                  Clear nearby search
                </button>
              )}
            </div>
          </div>

          {locationError && (
            <div className="alert alert-warning" role="alert">
              {locationError}
            </div>
          )}

          {nearMode && !locating && !error && (
            <p className="small text-muted">
              Showing verified organizations within {radiusKm} km of your current location,
              nearest first.
            </p>
          )}

          {loading && <LoadingSpinner label="Loading organizations..." />}
          {locating && <LoadingSpinner label="Finding organizations near you..." />}

          {!loading && !locating && error && (
            <div className="alert alert-warning" role="alert">
              <p className="mb-2">{error}</p>
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={loadOrganizations}>
                Try again
              </button>
            </div>
          )}

          {!loading && !locating && !error && organizations.length === 0 && (
            <EmptyState
              title={nearMode ? 'No organizations within this radius' : 'No organizations to show yet'}
              message={
                nearMode
                  ? 'Try a larger radius, or browse the full directory with the city filter.'
                  : 'The directory is empty. Verified NGOs and beneficiaries will appear here as soon as the organizations API is connected and admin verification is complete.'
              }
              action={
                nearMode ? (
                  <button type="button" className="btn btn-outline-success" onClick={exitNearMode}>
                    Browse full directory
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline-success" onClick={loadOrganizations}>
                    Refresh
                  </button>
                )
              }
            />
          )}

          {!loading && !locating && !error && organizations.length > 0 && (
            <div className="row g-4">
              {organizations.map((org) => (
                <div className="col-12 col-md-6 col-lg-4" key={org._id}>
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h2 className="h6 mb-0">{org.organizationName}</h2>
                        <span className="badge text-bg-success">Verified</span>
                      </div>
                      <div className="d-flex gap-2 align-self-start mb-2 flex-wrap">
                        <span className="badge text-bg-light border">{org.organizationType}</span>
                        {typeof org.distanceKm === 'number' && (
                          <span className="badge text-bg-info border">{org.distanceKm} km away</span>
                        )}
                      </div>
                      <p className="small text-muted flex-grow-1">{org.description}</p>
                      <p className="small mb-0 text-muted">
                        {org.city ? `${org.city} - ` : ''}
                        {org.address}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-5">
            <p className="text-muted mb-2">Want to receive donations for your organization?</p>
            <Link to="/register" className="btn btn-success">
              Register your organization
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
