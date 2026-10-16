import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage, validateAuthForm } from '../../utils/validation'

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: '',
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const nextErrors = validateAuthForm(form, { isRegister: true })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      })
      navigate('/login', { state: { registered: true } })
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Unable to create the account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-9 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <h1 className="h4 mb-2">Create an account</h1>
                <p className="text-muted small mb-4">
                  Register as a donor to give items, or as an organization to receive them.
                  Organization accounts become visible to donors only after admin
                  verification.
                </p>

                {serverError && (
                  <div className="alert alert-danger" role="alert">
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12">
                      <label htmlFor="reg-name" className="form-label">
                        Full name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="reg-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        value={form.name}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.name)}
                      />
                      {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="reg-email" className="form-label">
                        Email address <span className="text-danger">*</span>
                      </label>
                      <input
                        id="reg-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        value={form.email}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.email)}
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="reg-phone" className="form-label">
                        Phone
                      </label>
                      <input
                        id="reg-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        className="form-control"
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="reg-password" className="form-label">
                        Password <span className="text-danger">*</span>
                      </label>
                      <input
                        id="reg-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={form.password}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.password)}
                      />
                      {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="reg-confirm" className="form-label">
                        Confirm password <span className="text-danger">*</span>
                      </label>
                      <input
                        id="reg-confirm"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                        value={form.confirmPassword}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.confirmPassword)}
                      />
                      {errors.confirmPassword && (
                        <div className="invalid-feedback">{errors.confirmPassword}</div>
                      )}
                    </div>

                    <div className="col-12">
                      <label className="form-label d-block">
                        Account type <span className="text-danger">*</span>
                      </label>

                      <div className="row g-2">
                        <div className="col-12 col-sm-6">
                          <div className={`form-check border rounded p-3 ${errors.role ? 'border-danger' : ''}`}>
                            <input
                              className="form-check-input"
                              type="radio"
                              name="role"
                              id="role-donor"
                              value="donor"
                              checked={form.role === 'donor'}
                              onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor="role-donor">
                              <strong>Donor</strong>
                              <span className="d-block small text-muted">
                                I want to donate clothes and household items
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="col-12 col-sm-6">
                          <div className={`form-check border rounded p-3 ${errors.role ? 'border-danger' : ''}`}>
                            <input
                              className="form-check-input"
                              type="radio"
                              name="role"
                              id="role-organization"
                              value="organization"
                              checked={form.role === 'organization'}
                              onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor="role-organization">
                              <strong>Organization</strong>
                              <span className="d-block small text-muted">
                                NGO, orphanage or beneficiary receiving donations
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {errors.role && <div className="text-danger small mt-1">{errors.role}</div>}
                      <p className="form-text mb-0">
                        Admin accounts are created by the platform team and cannot be
                        self-registered.
                      </p>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-success w-100 mt-4" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Creating account...
                      </>
                    ) : (
                      'Create account'
                    )}
                  </button>
                </form>

                <p className="small text-center text-muted mt-4 mb-0">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
