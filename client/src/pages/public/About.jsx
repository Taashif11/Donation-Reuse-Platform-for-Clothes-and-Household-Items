import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'

const OBJECTIVES = [
  'Centralized donation platform in one place',
  'Connect donors with verified NGOs and beneficiaries',
  'Doorstep collection scheduling and tracking',
  'Transparent donation status from request to completion',
  'Donation history for donors and receiving organizations',
  'Multi-city support with basic reporting for admins',
]

const NOT_INCLUDED = [
  'No payment gateway of any kind',
  'No cash donations',
  'No auction system',
  'No resale functionality',
]

export default function About() {
  return (
    <>
      <PageHeader
        title="About the platform"
        subtitle="Why a donation and reuse platform exists, and what it deliberately does not do."
      />

      <section className="page-section">
        <div className="container">
          <div className="row g-5">
            <div className="col-12 col-lg-8">
              <h2 className="h4 mb-3">The problem</h2>
              <p className="text-muted">
                Many households have clothes and household items they no longer use, but
                donating them is harder than it should be. People cannot easily find
                verified NGOs, coordinating a pickup is awkward, and there is no clear
                record of whether a donation actually reached its destination.
              </p>

              <h2 className="h4 mt-4 mb-3">Our approach</h2>
              <p className="text-muted">
                The platform centralizes the whole process. Donors list items and choose
                a verified organization, organizations accept requests and schedule
                collections, and every step is recorded with a clear status. Admins keep
                the directory trustworthy by verifying each organization before it
                becomes visible to donors.
              </p>

              <h2 className="h4 mt-4 mb-3">Primary objectives</h2>
              <ul className="text-muted">
                {OBJECTIVES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="alert alert-info mt-4" role="note">
                <strong>Not a fundraising platform.</strong> The platform handles physical,
                in-kind donations only.
              </div>
            </div>

            <aside className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h2 className="h6 text-uppercase text-muted mb-3">Out of scope</h2>
                  <ul className="list-unstyled mb-0">
                    {NOT_INCLUDED.map((item) => (
                      <li key={item} className="d-flex align-items-start mb-2">
                        <span className="badge text-bg-light border me-2 mt-1" aria-hidden="true">
                          &times;
                        </span>
                        <span className="small">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-uppercase text-muted mb-3">User roles</h2>
                  <p className="small mb-2">
                    <strong>Donors</strong> - list items, schedule pickups, track history.
                  </p>
                  <p className="small mb-2">
                    <strong>Organizations</strong> - NGOs and beneficiaries that receive
                    donations after admin verification.
                  </p>
                  <p className="small mb-3">
                    <strong>Admins</strong> - verify organizations, manage data, handle
                    complaints and generate reports.
                  </p>
                  <Link to="/how-it-works" className="btn btn-outline-success btn-sm w-100">
                    See how it works
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
