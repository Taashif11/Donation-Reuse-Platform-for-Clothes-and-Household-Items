import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage, validateAuthForm } from '../../utils/validation'
import { DASHBOARD_PATHS } from '../../utils/constants'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const registered = Boolean(location.state?.registered)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const nextErrors = validateAuthForm(form, { isRegister: false })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const loggedInUser = await login(form)
      // Each role lands on its own dashboard.
      const destination = DASHBOARD_PATHS[loggedInUser.role] || '/'
      navigate(destination, { replace: true })
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <h1 className="h4 mb-2">Sign in</h1>
                <p className="text-muted small mb-4">
                  Access your donations, pickups and notifications.
                </p>

                {registered && (
                  <div className="alert alert-success" role="alert">
                    Registration successful. Please sign in with your new account.
                  </div>
                )}

                {serverError && (
                  <div className="alert alert-danger" role="alert">
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="login-email" className="form-label">
                      Email address
                    </label>
                    <input
                      id="login-email"
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

                  <div className="mb-4">
                    <label htmlFor="login-password" className="form-label">
                      Password
                    </label>
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      value={form.password}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.password)}
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>

                  <button type="submit" className="btn btn-success w-100" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </form>

                <p className="small text-center text-muted mt-4 mb-0">
                  New here?{' '}
                  <Link to="/register">Create an account</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
