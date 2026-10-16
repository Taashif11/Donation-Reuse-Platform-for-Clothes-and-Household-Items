// Shown when a list has no results (or data is not available yet).
export default function EmptyState({ title, message, action }) {
  return (
    <div className="text-center py-5 px-3 empty-state">
      <h3 className="h5 mb-2">{title}</h3>
      <p className="text-muted mb-3" style={{ maxWidth: '32rem', margin: '0 auto' }}>
        {message}
      </p>
      {action}
    </div>
  )
}
