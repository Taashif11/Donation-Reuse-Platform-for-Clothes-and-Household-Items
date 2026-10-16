import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLE_LABELS = {
  donor: 'Donor',
  organization: 'Organization',
  admin: 'Admin',
}

// Slim top bar for every dashboard page (donor / organization / admin).
// The public Navbar is not rendered inside the dashboards, so this is the only
// place a signed-in user can get back to the public site or sign out.
export default function DashboardHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky-top bg-white site-navbar py-2">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <Link className="navbar-brand fw-bold mb-0" to="/">
            <span className="brand-mark">D</span>
            <span className="ms-2 d-none d-sm-inline">DonateReuse</span>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted d-none d-md-inline">
              {user?.name}
              {user?.role && ` - ${ROLE_LABELS[user.role] || user.role}`}
            </span>
            <Link to="/" className="btn btn-outline-secondary btn-sm">
              Back to site
            </Link>
            <button type="button" className="btn btn-outline-success btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
