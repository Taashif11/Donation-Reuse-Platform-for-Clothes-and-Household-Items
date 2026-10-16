import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

// Access the current user and auth actions anywhere in the app.
export function useAuth() {
  return useContext(AuthContext)
}
