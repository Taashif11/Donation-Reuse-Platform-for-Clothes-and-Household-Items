import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import categoryService from '../../services/categoryService'
import { getApiErrorMessage } from '../../utils/validation'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'

// Admin category management: create, rename, soft-delete and restore.
export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', description: '' })
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState({ name: '', description: '' })

  function loadCategories() {
    setLoading(true)
    setError('')
    categoryService
      .listAll()
      .then((res) => setCategories(res.data.categories))
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load categories.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    setFormError('')
    setSaving(true)

    try {
      await categoryService.create(form)
      setForm({ name: '', description: '' })
      loadCategories()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to create the category.'))
    } finally {
      setSaving(false)
    }
  }

  function startEditing(category) {
    setEditingId(category._id)
    setEditForm({ name: category.name, description: category.description || '' })
    setFormError('')
  }

  async function handleUpdate(event) {
    event.preventDefault()
    setFormError('')
    setSaving(true)

    try {
      await categoryService.update(editingId, editForm)
      setEditingId('')
      loadCategories()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to update the category.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSoftDelete(category) {
    const confirmed = window.confirm(
      `Hide "${category.name}" from the donation forms? You can restore it later.`
    )
    if (!confirmed) return

    setFormError('')
    setSaving(true)
    try {
      await categoryService.remove(category._id)
      loadCategories()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to deactivate the category.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRestore(category) {
    setFormError('')
    setSaving(true)
    try {
      await categoryService.update(category._id, { isActive: true })
      loadCategories()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to restore the category.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Categories</h1>
          <p className="text-muted small mb-0">
            The item categories donors can choose from.
          </p>
        </div>
        <Link to="/admin" className="btn btn-outline-secondary">
          Back to dashboard
        </Link>
      </div>

      {formError && (
        <div className="alert alert-danger" role="alert">
          {formError}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">Add a category</h2>
          <form onSubmit={handleCreate}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label htmlFor="cat-name" className="form-label">
                  Name
                </label>
                <input
                  id="cat-name"
                  className="form-control"
                  maxLength={60}
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="cat-description" className="form-label">
                  Description
                </label>
                <input
                  id="cat-description"
                  className="form-control"
                  maxLength={300}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="col-12 col-md-2">
                <button type="submit" className="btn btn-success w-100" disabled={saving}>
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted mb-3">All categories</h2>

          {loading ? (
            <LoadingSpinner label="Loading categories..." />
          ) : error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              title="No categories yet"
              message="Create the first category with the form above."
            />
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Slug</th>
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const active = category.isActive !== false

                    if (editingId === category._id) {
                      return (
                        <tr key={category._id}>
                          <td colSpan={5}>
                            <form onSubmit={handleUpdate} className="row g-2 align-items-end">
                              <div className="col-12 col-md-3">
                                <input
                                  className="form-control form-control-sm"
                                  maxLength={60}
                                  required
                                  aria-label="Category name"
                                  value={editForm.name}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      name: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-5">
                                <input
                                  className="form-control form-control-sm"
                                  maxLength={300}
                                  aria-label="Category description"
                                  value={editForm.description}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      description: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-4 d-flex flex-wrap gap-2">
                                <button type="submit" className="btn btn-success btn-sm" disabled={saving}>
                                  {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => setEditingId('')}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={category._id} className={active ? '' : 'table-secondary'}>
                        <td className="fw-semibold">{category.name}</td>
                        <td>{category.slug}</td>
                        <td className="small text-muted">{category.description || '-'}</td>
                        <td>
                          <span
                            className={`badge ${active ? 'text-bg-success' : 'text-bg-danger'}`}
                          >
                            {active ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled={saving}
                              onClick={() => startEditing(category)}
                            >
                              Edit
                            </button>
                            {active ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={saving}
                                onClick={() => handleSoftDelete(category)}
                              >
                                Hide
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success"
                                disabled={saving}
                                onClick={() => handleRestore(category)}
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
