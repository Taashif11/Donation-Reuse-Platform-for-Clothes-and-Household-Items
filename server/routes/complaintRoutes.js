const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createComplaint,
  listComplaints,
  getComplaint,
} = require('../controllers/complaintController');
const {
  createComplaintRules,
  listComplaintRules,
  complaintIdRules,
} = require('../validators/complaintValidators');

const router = express.Router();

// Reading is open to every signed-in role (the controller scopes the results);
// only donors and organizations may raise a complaint - admins get 403 on POST.
router.use(protect, authorize('donor', 'organization', 'admin'))

// GET /api/complaints  (?status=&page=&limit=)
router.get('/', listComplaintRules, validate, listComplaints)

// POST /api/complaints - donors and organizations only.
router.post('/', authorize('donor', 'organization'), createComplaintRules, validate, createComplaint)

// GET /api/complaints/:id - owner or admin; anyone else gets 404.
router.get('/:id', complaintIdRules, validate, getComplaint)

module.exports = router;
