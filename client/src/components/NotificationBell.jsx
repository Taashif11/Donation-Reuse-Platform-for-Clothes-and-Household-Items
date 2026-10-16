import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import notificationService from '../services/notificationService'

// Where the bell sends the current role when the user wants the full list.
const NOTIFICATION_PATHS = {
  donor: '/donor/notifications',
  organization: '/organization/notifications',
  admin: '/admin/notifications',
}

// Small bell icon (no icon library needed).
function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.5a3.5 3.5 0 0 0-3.5 3.5c0 1.3-.6 2.4-1.5 3.1L2.5 9.5h11l-.5-1.4c-.9-.7-1.5-1.8-1.5-3.1A3.5 3.5 0 0 0 8 1.5z" />
      <path d="M4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z" />
    </svg>
  )
}

// Unread badge + dropdown with the latest notifications (Phase 10).
export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  const homePath = NOTIFICATION_PATHS[user?.role]

  // Badge polling: a failed count call never breaks the page.
  const refreshCount = useCallback(() => {
    notificationService
      .getUnreadCount()
      .then((res) => setUnreadCount(res.data.unreadCount))
      .catch(() => null)
  }, [])

  useEffect(() => {
    refreshCount()
    const timer = setInterval(refreshCount, 60000)
    return () => clearInterval(timer)
  }, [refreshCount])

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!open) return undefined

    function handleOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (!next) return

    setLoading(true)
    notificationService
      .list({ limit: 5 })
      .then((res) => setItems(res.data.notifications))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  // Opening a notification marks it read (already-read ones are skipped, the
  // API answers 400 for those) and then shows the full notifications page.
  async function handleOpen(notification) {
    if (notification.isRead) {
      setOpen(false)
      navigate(homePath)
      return
    }

    try {
      await notificationService.markRead(notification._id)
      setUnreadCount((count) => Math.max(0, count - 1))
      setItems((prev) =>
        prev.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
      )
      setOpen(false)
      navigate(homePath)
    } catch {
      // Keep the dropdown open so the user can try again.
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllRead()
      setUnreadCount(0)
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
    } catch {
      // Nothing to show - the badge simply stays where it is.
    }
  }

  return (
    <div className="dropdown position-relative" ref={wrapperRef}>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm position-relative"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notifications, ${unreadCount} unread`}
        onClick={toggleOpen}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* The width comes from .notification-menu in index.css so the panel
          never grows wider than the phone screen. */}
      {open && (
        <div className="dropdown-menu dropdown-menu-end show mt-2 p-0 notification-menu" role="menu">
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <span className="small text-uppercase text-muted">Notifications</span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none"
              disabled={unreadCount === 0}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          </div>

          <div className="list-group list-group-flush" style={{ maxHeight: '18rem', overflowY: 'auto' }}>
            {loading ? (
              <div className="px-3 py-3 small text-muted">Loading...</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-3 small text-muted">No notifications yet.</div>
            ) : (
              items.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  className={`list-group-item list-group-item-action${notification.isRead ? '' : ' bg-light'}`}
                  onClick={() => handleOpen(notification)}
                >
                  <div className="d-flex align-items-center gap-2">
                    {!notification.isRead && (
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{ width: '0.5rem', height: '0.5rem', backgroundColor: 'var(--brand-primary)' }}
                      />
                    )}
                    <span className="small fw-semibold">{notification.title}</span>
                  </div>
                  <div
                    className="small text-muted"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {notification.message}
                  </div>
                  <div className="small text-muted mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-top px-3 py-2 text-end">
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none"
              onClick={() => {
                setOpen(false)
                navigate(homePath)
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
