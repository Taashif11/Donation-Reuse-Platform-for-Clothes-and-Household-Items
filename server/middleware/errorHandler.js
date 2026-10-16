const { failure } = require('../utils/apiResponse');

// 404: no route matched the request.
function notFound(req, res) {
  return failure(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// Central error handler. Express forwards thrown/rejected errors here.
// Keeps controllers free of repetitive try/catch blocks.
function errorHandler(err, req, res, next) {
  // Mongoose schema validation -> 400 with field messages
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    return failure(res, 'Validation failed', 400, errors)
  }

  // Bad ObjectId or other failed casts -> 400
  if (err.name === 'CastError') {
    return failure(res, `Invalid value for ${err.path}`, 400)
  }

  // Duplicate key (e.g. email already registered) -> 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    return failure(res, `Duplicate value for ${field}`, 409)
  }

  // Body-parser: malformed JSON in the request body -> 400
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return failure(res, 'Invalid JSON in request body', 400)
  }

  // Body-parser: request body larger than the express.json limit -> 413
  if (err.type === 'entity.too.large') {
    return failure(res, 'Request body too large', 413)
  }

  const statusCode = err.statusCode || err.status || 500

  // Log unexpected errors, but never leak stack traces or internals to clients.
  if (statusCode >= 500) {
    console.error(err)
    return failure(res, 'Internal server error', 500)
  }

  return failure(res, err.message, statusCode)
}

module.exports = { notFound, errorHandler }
