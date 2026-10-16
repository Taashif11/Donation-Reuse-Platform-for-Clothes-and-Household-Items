// Shared loading indicator used while API data is being fetched.
export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="text-center py-5" role="status" aria-live="polite">
      <div className="spinner-border text-success" aria-hidden="true"></div>
      <p className="mt-3 mb-0 text-muted">{label}</p>
    </div>
  )
}
