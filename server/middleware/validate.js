const { validationResult } = require('express-validator');
const { failure } = require('../utils/apiResponse');

// Runs after express-validator rules and returns 400 with field-level messages.
function validate(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next()
  }

  const errors = result.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }))

  return failure(res, 'Validation failed', 400, errors)
}

module.exports = validate;
