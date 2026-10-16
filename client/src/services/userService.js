// Current user profile API calls.
import api from './api'

const userService = {
  getMe() {
    return api.get('/users/me').then((response) => response.data)
  },

  updateMe(payload) {
    return api.patch('/users/me', payload).then((response) => response.data)
  },
}

export default userService
