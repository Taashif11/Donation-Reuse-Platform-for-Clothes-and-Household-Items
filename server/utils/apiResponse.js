// Single place that shapes every API response, so all endpoints stay consistent:
// { success: true, message, data }  /  { success: false, message, errors? }

function success(res, message, data = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data })
}

function failure(res, message, statusCode = 400, errors = null) {
  const body = { success: false, message }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}

module.exports = { success, failure }
