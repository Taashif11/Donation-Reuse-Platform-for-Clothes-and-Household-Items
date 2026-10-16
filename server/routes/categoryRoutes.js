const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getCategories,
  getCategory,
  listAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const {
  getCategoryRules,
  categoryIdRules,
  createCategoryRules,
  updateCategoryRules,
} = require('../validators/categoryValidators');
const validate = require('../middleware/validate');

const router = express.Router();

// ---------- Admin management (Phase 9) ----------
// Registered before the public /:id route so "manage" is never read as an id.
router.get('/manage', protect, authorize('admin'), listAllCategories)
router.post('/', protect, authorize('admin'), createCategoryRules, validate, createCategory)
router.patch('/:id', protect, authorize('admin'), updateCategoryRules, validate, updateCategory)
router.delete('/:id', protect, authorize('admin'), categoryIdRules, validate, deleteCategory)

// ---------- Public reads ----------
// GET /api/categories
router.get('/', getCategories)

// GET /api/categories/:id  (ObjectId or slug)
router.get('/:id', getCategoryRules, validate, getCategory)

module.exports = router;
