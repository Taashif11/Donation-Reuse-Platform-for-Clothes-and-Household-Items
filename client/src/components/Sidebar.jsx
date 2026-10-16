import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NotificationBell from './NotificationBell'

// One dashboard menu per role; the sidebar picks the current user's menu.
const MENUS = {
  donor: {
    title: 'Donor Menu',
    ariaLabel: 'Donor navigation',
    links: [
      { to: '/donor', label: 'Dashboard', end: true },
      { to: '/donor/donate', label: 'Donate Items' },
      { to: '/donor/history', label: 'Donation History' },
      { to: '/donor/notifications', label: 'Notifications' },
      { to: '/donor/complaints', label: 'Complaints' },
      { to: '/donor/profile', label: 'My Profile' },
    ],
  },
  organization: {
    title: 'Organization Menu',
    ariaLabel: 'Organization navigation',
    links: [
      { to: '/organization', label: 'Dashboard', end: true },
      { to: '/organization/requests', label: 'Donation Requests' },
      { to: '/organization/notifications', label: 'Notifications' },
      { to: '/organization/complaints', label: 'Complaints' },
      { to: '/organization/profile', label: 'Organization Profile' },
    ],
  },
  admin: {
    title: 'Admin Menu',
    ariaLabel: 'Admin navigation',
    links: [
      { to: '/admin', label: 'Dashboard', end: true },
      { to: '/admin/organizations', label: 'Organizations' },
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/donations', label: 'Donations' },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/complaints', label: 'Complaints' },
      { to: '/admin/reports', label: 'Reports' },
      { to: '/admin/notifications', label: 'Notifications' },
    ],
  },
}

// Dashboard navigation, shown on the left on desktop and on top on mobile.
export default function Sidebar() {
  const { user } = useAuth()
  // No donor-menu fallback: an unknown role simply gets no menu.
  const menu = MENUS[user?.role]

  if (!menu) return null

  return (
    <div className="card border-0 shadow-sm sidebar-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h6 text-uppercase text-muted mb-0">{menu.title}</h2>
          <NotificationBell />
        </div>
        <nav aria-label={menu.ariaLabel}>
          {/* `sidebar-nav` turns this into a horizontally scrollable pill row
              below the lg breakpoint so it never buries the page content. */}
          <ul className="nav flex-column gap-1 sidebar-nav">
            {menu.links.map((link) => (
              <li className="nav-item" key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `nav-link rounded px-3 py-2 sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
