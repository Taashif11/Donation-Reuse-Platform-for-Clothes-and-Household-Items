import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="page-section">
      <div className="container text-center">
        <span className="display-6 fw-bold text-success">404</span>
        <h1 className="h3 mt-2 mb-3">Page not found</h1>
        <p className="text-muted mb-4">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn btn-success">
          Back to home
        </Link>
      </div>
    </section>
  )
}
