import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import notificationService from '../services/notificationService'
import { getApiErrorMessage } from '../utils/validation'
import { DASHBOARD_PATHS } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10

// Badge colour per notification category (mirror of the backend enum).
const TYPE_STYLES = {
  donation: 'text-bg-primary',
  collection: 'text-bg-info text-dark',
  verification: 'text-bg-warning text-dark',
  complaint: 'text-bg-danger',
  general: 'text-bg-secondary',
}

// The page a "View donation" link should open for each role.
function donationPath(role, id) {
  if (role === 'donor') return `/donor/donations/${id}`
  if (role === 'organization') return `/organization/donations/${id}`
  return '/admin/donations'
}

// The signed-in user's own notifications (Phase 10), for every role.
export default function Notifications() {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const params = { page, limit: PAGE_SIZE }
    if (unreadOnly) params.unread = 'true'

    notificationService
      .list(params)
      .then((res) => {
        if (cancelled) return
        setNotifications(res.data.notifications)
        setTotal(res.data.pagination.total)
        setTotalPages(res.data.pagination.totalPages)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Unable to load notifications.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [unreadOnly, page])

  function changeFilter(nextUnread) {
    setUnreadOnly(nextUnread)
    setPage(1)
    setLoading(true)
    setError('')
    setActionError('')
  }

  async function handleMarkRead(notification) {
    setActionError('')
    setSaving(true)
    try {
      await notificationService.markRead(notification._id)
      setNotifications((prev) =>
        prev.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
      )
      if (unreadOnly) changeFilter(true)
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to mark the notification as read.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkAllRead() {
    setActionError('')
    setSaving(true)
    try {
      await notificationService.markAllRead()
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to mark all notifications as read.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Notifications</h1>
          <p className="text-muted small mb-0">
            Updates about your donations, pickups, verification and complaints.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to={DASHBOARD_PATHS[user?.role] || '/'} className="btn btn-outline-secondary">
            Back to dashboard
          </Link>
          <button
            type="button"
            className="btn btn-success"
            disabled={saving || total === 0}
            onClick={handleMarkAllRead}
          >
            {saving ? 'Saving...' : 'Mark all as read'}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
          <div className="btn-group" role="group" aria-label="Notification filter">
            <button
              type="button"
              className={`btn btn-sm ${unreadOnly ? 'btn-outline-secondary' : 'btn-success'}`}
              onClick={() => changeFilter(false)}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-sm ${unreadOnly ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => changeFilter(true)}
            >
              Unread only
            </button>
          </div>
          <span className="small text-muted">{total} notification{total === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <LoadingSpinner label="Loading notifications..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              message="Notifications appear here when a donation, pickup, verification or complaint changes."
            />
          ) : (
            <>
              <div className="list-group list-group-flush">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`list-group-item px-0${notification.isRead ? '' : ' bg-light'}`}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                      <div className="d-flex align-items-center gap-2">
                        {!notification.isRead && (
                          <span
                            className="rounded-circle flex-shrink-0"
                            style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              backgroundColor: 'var(--brand-primary)',
                            }}
                          />
                        )}
                        <span className={`badge ${TYPE_STYLES[notification.type] || 'text-bg-secondary'}`}>
                          {(notification.type || 'general').toUpperCase()}
                        </span>
                        <span className="fw-semibold">{notification.title}</span>
                      </div>
                      <span className="small text-muted">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="mb-2 mt-2">{notification.message}</p>

                    <div className="d-flex flex-wrap gap-2">
                      {!notification.isRead && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          disabled={saving}
                          onClick={() => handleMarkRead(notification)}
                        >
                          Mark as read
                        </button>
                      )}
                      {notification.relatedDonation && (
                        <Link
                          to={donationPath(user?.role, notification.relatedDonation)}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          View donation
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                pagination={{ page, totalPages, total }}
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  setLoading(true)
                  setError('')
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
