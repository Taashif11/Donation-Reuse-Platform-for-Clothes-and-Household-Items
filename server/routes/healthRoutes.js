const express = require('express');
const { success } = require('../utils/apiResponse');

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  return success(res, 'Donation & Reuse Platform API is running', {
    timestamp: new Date().toISOString(),
  })
});

module.exports = router;
