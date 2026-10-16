import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import DashboardHeader from '../components/DashboardHeader'

// Layout for every dashboard page: slim top bar, sidebar menu + page content.
// The top bar is what carries the "Back to site" and Logout actions - the
// public Navbar (and its menu) is intentionally not rendered here.
export default function DashboardLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <DashboardHeader />
      <main className="page-section pt-4 pb-5 flex-grow-1">
        <div className="container">
          <div className="row g-4">
            {/* On phones the sidebar stacks above the content; below 992px it
                becomes a horizontally scrollable pill row (see index.css). */}
            <div className="col-12 col-lg-3">
              <Sidebar />
            </div>
            <div className="col-12 col-lg-9">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
