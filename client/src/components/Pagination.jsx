// Simple previous/next pagination for list pages.
export default function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, total } = pagination

  if (!totalPages || totalPages <= 1) {
    return null
  }

  return (
    <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 mt-3">
      <span className="small text-muted">
        {total} result{total === 1 ? '' : 's'} - page {page} of {totalPages}
      </span>

      <div className="btn-group">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
