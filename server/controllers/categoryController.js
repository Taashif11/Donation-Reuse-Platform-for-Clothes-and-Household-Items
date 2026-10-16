const mongoose = require('mongoose');
const Category = require('../models/Category');
const { success, failure } = require('../utils/apiResponse');

// GET /api/categories
// Public list of active categories (used in donation forms and filters).
async function getCategories(req, res) {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 })

  return success(res, 'Categories fetched successfully', { categories })
}

// GET /api/categories/:id
// Accepts either the ObjectId or the slug (e.g. /api/categories/clothing).
async function getCategory(req, res) {
  const { id } = req.params

  const query = mongoose.isValidObjectId(id) ? { _id: id } : { slug: id }
  const category = await Category.findOne(query)

  if (!category) {
    return failure(res, 'Category not found', 404)
  }

  return success(res, 'Category fetched successfully', { category })
}

// ---------- Admin management (Phase 9) ----------

// Helper: is another category already using this name?
async function findDuplicateName(name, excludeId) {
  const regex = new RegExp(`^${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  const filter = { name: regex }
  if (excludeId) filter._id = { $ne: excludeId }
  return Category.findOne(filter)
}

// GET /api/categories/manage (admin) - every category, active or not.
async function listAllCategories(req, res) {
  const categories = await Category.find().sort({ name: 1 })

  return success(res, 'Categories fetched successfully', { categories })
}

// POST /api/categories (admin) - create a category.
async function createCategory(req, res) {
  const name = String(req.body.name).trim()
  const description = req.body.description ? String(req.body.description).trim() : ''

  if (await findDuplicateName(name)) {
    return failure(res, 'A category with this name already exists', 409)
  }

  try {
    const category = await Category.create({ name, description })
    return success(res, 'Category created successfully', { category }, 201)
  } catch (error) {
    if (error.code === 11000) {
      return failure(res, 'A category with this name already exists', 409)
    }
    throw error
  }
}

// PATCH /api/categories/:id (admin) - rename / edit / re-activate a category.
async function updateCategory(req, res) {
  const category = await Category.findById(req.params.id)
  if (!category) {
    return failure(res, 'Category not found', 404)
  }

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim()
    const duplicate = await findDuplicateName(name, category._id)
    if (duplicate) {
      return failure(res, 'A category with this name already exists', 409)
    }
    category.name = name
  }

  if (req.body.description !== undefined) {
    category.description = String(req.body.description).trim()
  }

  if (req.body.isActive !== undefined) {
    category.isActive = Boolean(req.body.isActive)
  }

  try {
    await category.save()
  } catch (error) {
    if (error.code === 11000) {
      return failure(res, 'A category with this name already exists', 409)
    }
    throw error
  }

  return success(res, 'Category updated successfully', { category })
}

// DELETE /api/categories/:id (admin) - soft delete (isActive: false).
async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id)
  if (!category) {
    return failure(res, 'Category not found', 404)
  }

  if (category.isActive === false) {
    return failure(res, 'Category is already inactive', 400)
  }

  category.isActive = false
  await category.save()

  return success(res, 'Category deactivated successfully', { category })
}

module.exports = {
  getCategories,
  getCategory,
  listAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
