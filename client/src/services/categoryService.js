// Category API calls.
import api from './api'

const categoryService = {
  getCategories() {
    return api.get('/categories').then((response) => response.data)
  },

  // ---------- Admin management (Phase 9) ----------
  // Every category, active or not (used to re-activate a soft-deleted one).
  listAll() {
    return api.get('/categories/manage').then((response) => response.data)
  },

  create(payload) {
    return api.post('/categories', payload).then((response) => response.data)
  },

  update(id, payload) {
    return api.patch(`/categories/${id}`, payload).then((response) => response.data)
  },

  // Soft delete: the category stays in the database with isActive = false.
  remove(id) {
    return api.delete(`/categories/${id}`).then((response) => response.data)
  },
}

export default categoryService
