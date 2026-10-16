import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// Wrapper for all public pages: navigation on top, footer at the bottom.
export default function PublicLayout() {
  return (
    <div className="public-layout d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
