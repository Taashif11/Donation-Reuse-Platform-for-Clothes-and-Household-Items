// Authentication API calls. Every page/context uses these instead of axios directly.
import api from './api'

const authService = {
  register(payload) {
    return api.post('/auth/register', payload).then((response) => response.data)
  },

  login(credentials) {
    return api.post('/auth/login', credentials).then((response) => response.data)
  },

  getMe() {
    return api.get('/auth/me').then((response) => response.data)
  },
}

export default authService
