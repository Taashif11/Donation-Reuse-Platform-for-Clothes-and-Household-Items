import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer pt-5 pb-3">
      <div className="container">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <h2 className="h5 text-white mb-3">DonateReuse</h2>
            <p className="mb-0 small">
              A platform that connects unused clothes and household items with verified
              NGOs and beneficiaries - with doorstep collection and transparent tracking.
            </p>
          </div>

          <div className="col-6 col-md-3">
            <h3 className="h6 text-white mb-3">Platform</h3>
            <ul className="list-unstyled small footer-links">
              <li>
                <Link to="/how-it-works">How It Works</Link>
              </li>
              <li>
                <Link to="/ngos">Browse NGOs</Link>
              </li>
              <li>
                <Link to="/impact">Impact</Link>
              </li>
              <li>
                <Link to="/about">About Us</Link>
              </li>
            </ul>
          </div>

          <div className="col-6 col-md-3">
            <h3 className="h6 text-white mb-3">Get Involved</h3>
            <ul className="list-unstyled small footer-links">
              <li>
                <Link to="/register">Become a Donor</Link>
              </li>
              <li>
                <Link to="/register">Register an Organization</Link>
              </li>
              <li>
                <Link to="/login">Sign In</Link>
              </li>
              <li>
                <Link to="/contact">Contact Us</Link>
              </li>
            </ul>
          </div>

          <div className="col-12 col-md-2">
            <h3 className="h6 text-white mb-3">Note</h3>
            <p className="small text-muted mb-0">
              This platform does not handle payments, cash donations or resale. Donations
              are in kind only.
            </p>
          </div>
        </div>

        <hr className="border-secondary my-4" />

        <div className="d-flex flex-column flex-sm-row justify-content-between small text-muted">
          <span>&copy; {year} DonateReuse Platform. Built as an internship project.</span>
          <span>Donations are items only - no payments processed.</span>
        </div>
      </div>
    </footer>
  )
}
