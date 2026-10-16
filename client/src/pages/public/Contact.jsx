import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import api from '../../services/api'
import { getApiErrorMessage } from '../../utils/validation'

const INITIAL_FORM = { name: '', email: '', subject: '', message: '' }

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success
  const [serverError, setServerError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (!form.subject.trim()) next.subject = 'Subject is required.'
    if (!form.message.trim()) next.message = 'Message is required.'
    else if (form.message.trim().length < 10) next.message = 'Message must be at least 10 characters.'
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

    setStatus('sending')
    try {
      await api.post('/contact', form)
      setStatus('success')
      setForm(INITIAL_FORM)
    } catch (error) {
      setStatus('idle')
      setServerError(getApiErrorMessage(error, 'Unable to send your message.'))
    }
  }

  return (
    <>
      <PageHeader
        title="Contact us"
        subtitle="Questions about donating, verification or pickups? Send us a message."
      />

      <section className="page-section">
        <div className="container">
          <div className="row g-5">
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h2 className="h6 text-uppercase text-muted mb-3">Platform support</h2>
                  <p className="small mb-1">
                    <strong>Email:</strong> support@donationreuse.example
                  </p>
                  <p className="small mb-1">
                    <strong>Hours:</strong> Mon - Fri, 9:00 - 18:00
                  </p>
                  <p className="small text-muted mb-0">
                    Contact details shown here are placeholders for this build and are
                    replaced with real support details at deployment time.
                  </p>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-uppercase text-muted mb-3">Other requests</h2>
                  <ul className="small text-muted ps-3 mb-0">
                    <li>Organization verification - handled by the admin team</li>
                    <li>Donation issues - use the complaints section after signing in</li>
                    <li>Partnership enquiries - mention it in your message</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4 p-md-5">
                  <h2 className="h5 mb-4">Send a message</h2>

                  {status === 'success' && (
                    <div className="alert alert-success" role="alert">
                      Your message has been sent. We will get back to you by email.
                    </div>
                  )}

                  {serverError && (
                    <div className="alert alert-danger" role="alert">
                      {serverError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label htmlFor="contact-name" className="form-label">
                          Name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          value={form.name}
                          onChange={handleChange}
                          aria-invalid={Boolean(errors.name)}
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label htmlFor="contact-email" className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          value={form.email}
                          onChange={handleChange}
                          aria-invalid={Boolean(errors.email)}
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>

                      <div className="col-12">
                        <label htmlFor="contact-subject" className="form-label">
                          Subject <span className="text-danger">*</span>
                        </label>
                        <input
                          id="contact-subject"
                          name="subject"
                          type="text"
                          className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                          value={form.subject}
                          onChange={handleChange}
                          aria-invalid={Boolean(errors.subject)}
                        />
                        {errors.subject && <div className="invalid-feedback">{errors.subject}</div>}
                      </div>

                      <div className="col-12">
                        <label htmlFor="contact-message" className="form-label">
                          Message <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id="contact-message"
                          name="message"
                          rows="5"
                          className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                          value={form.message}
                          onChange={handleChange}
                          aria-invalid={Boolean(errors.message)}
                        ></textarea>
                        {errors.message && <div className="invalid-feedback">{errors.message}</div>}
                      </div>
                    </div>

                    <button type="submit" className="btn btn-success mt-4" disabled={status === 'sending'}>
                      {status === 'sending' ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Sending...
                        </>
                      ) : (
                        'Send message'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
