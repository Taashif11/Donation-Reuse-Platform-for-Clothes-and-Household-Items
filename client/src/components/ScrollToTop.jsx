import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Without this a detail page opens halfway down the screen whenever the list
// page you came from was scrolled (browsers restore the scroll position on
// history navigation). Resets to the top on every route change.
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
