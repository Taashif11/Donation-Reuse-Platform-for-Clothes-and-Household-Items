// Central Axios instance for every REST API call.
// Components should import this instead of calling axios directly.
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the JWT from local storage to every request when the user is logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Phase 13: mid-session 401 (expired or revoked token) - drop the stale token
// and bounce to the login page instead of letting every page fail silently.
// The login page itself is skipped so its own 401 error message still shows.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url || ''

    const isAuthCall =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')

    if (status === 401 && localStorage.getItem('token') && !isAuthCall) {
      localStorage.removeItem('token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default api
