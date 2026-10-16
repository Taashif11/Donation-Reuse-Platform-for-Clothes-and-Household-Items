import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import authService from '../services/authService'

// Holds the current user for the whole app: login, register, logout, session restore.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  // On page load, if a token exists, ask the API who the current user is.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    authService
      .getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => {
        // Token expired or invalid - clean it up.
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(credentials) {
    const res = await authService.login(credentials)
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  async function register(payload) {
    const res = await authService.register(payload)
    return res.data
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  // Re-reads the current user from the API (e.g. after a profile update).
  async function refreshUser() {
    const res = await authService.getMe()
    setUser(res.data.user)
    return res.data.user
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: Boolean(user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
