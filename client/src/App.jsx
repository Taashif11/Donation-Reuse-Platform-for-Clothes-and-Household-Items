import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'

import Home from './pages/public/Home'
import About from './pages/public/About'
import HowItWorks from './pages/public/HowItWorks'
import BrowseNGOs from './pages/public/BrowseNGOs'
import Impact from './pages/public/Impact'
import Contact from './pages/public/Contact'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import NotFound from './pages/NotFound'
import Notifications from './pages/Notifications'
import Complaints from './pages/Complaints'

import DonorDashboard from './pages/donor/DonorDashboard'
import CreateDonation from './pages/donor/CreateDonation'
import DonationHistory from './pages/donor/DonationHistory'
import DonationDetails from './pages/donor/DonationDetails'
import DonorProfile from './pages/donor/DonorProfile'

import OrgDashboard from './pages/organization/OrgDashboard'
import DonationRequests from './pages/organization/DonationRequests'
import OrgDonationDetails from './pages/organization/OrgDonationDetails'
import OrgProfile from './pages/organization/OrgProfile'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrganizations from './pages/admin/AdminOrganizations'
import AdminOrganizationDetails from './pages/admin/AdminOrganizationDetails'
import AdminUsers from './pages/admin/AdminUsers'
import AdminDonations from './pages/admin/AdminDonations'
import AdminCategories from './pages/admin/AdminCategories'
import AdminComplaints from './pages/admin/AdminComplaints'
import AdminComplaintDetails from './pages/admin/AdminComplaintDetails'
import AdminReports from './pages/admin/AdminReports'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/ngos" element={<BrowseNGOs />} />
            <Route path="/impact" element={<Impact />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Donor dashboard (Phase 6). */}
          <Route
            path="/donor"
            element={
              <ProtectedRoute role="donor">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DonorDashboard />} />
            <Route path="donate" element={<CreateDonation />} />
            <Route path="history" element={<DonationHistory />} />
            <Route path="donations/:id" element={<DonationDetails />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="profile" element={<DonorProfile />} />
          </Route>

          {/* Organization/beneficiary dashboard (Phase 7). */}
          <Route
            path="/organization"
            element={
              <ProtectedRoute role="organization">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OrgDashboard />} />
            <Route path="requests" element={<DonationRequests />} />
            <Route path="donations/:id" element={<OrgDonationDetails />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="profile" element={<OrgProfile />} />
          </Route>

          {/* Admin dashboard (Phase 9) - admin role only. */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="organizations/:id" element={<AdminOrganizationDetails />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="donations" element={<AdminDonations />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="complaints/:id" element={<AdminComplaintDetails />} />
            {/* Phase 11 - reports and CSV exports, admin only. */}
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
