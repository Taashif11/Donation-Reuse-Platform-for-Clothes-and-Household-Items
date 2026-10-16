import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DASHBOARD_PATHS } from '../utils/constants'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/ngos', label: 'Browse NGOs' },
  { to: '/impact', label: 'Impact' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleLogout() {
    logout()
    closeMenu()
    navigate('/')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white site-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/" onClick={closeMenu}>
          <span className="brand-mark">D</span>
          <span className="ms-2">DonateReuse</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-navbar"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} id="main-navbar">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
            {NAV_LINKS.map((link) => (
              <li className="nav-item" key={link.to}>
                <NavLink
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={closeMenu}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}

            <li className="nav-item ms-lg-3 mt-3 mt-lg-0 d-flex flex-wrap gap-2">
              {user ? (
                <>
                  <span className="navbar-text small text-muted me-2">
                    Hi, {user.name?.split(' ')[0]}
                  </span>
                  {/* Admin dashboard link arrives in Phase 9. */}
                  {user.role !== 'admin' && DASHBOARD_PATHS[user.role] && (
                    <Link
                      className="btn btn-success btn-sm"
                      to={DASHBOARD_PATHS[user.role]}
                      onClick={closeMenu}
                    >
                      My Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link className="btn btn-outline-success btn-sm" to="/login" onClick={closeMenu}>
                    Login
                  </Link>
                  <Link className="btn btn-success btn-sm" to="/register" onClick={closeMenu}>
                    Register
                  </Link>
                </>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
