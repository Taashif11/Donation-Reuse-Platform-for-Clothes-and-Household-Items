// Phase 13 - dependency-free NoSQL-injection guard.
//
// Mongoose treats objects with keys like { "$gt": "" } or { "password.hash": 1 }
// as operators/paths. If raw JSON from the client ever reaches a query filter
// those keys could widen a match (e.g. logging in as anyone). Every route
// already validates its input, but this middleware is a safety net: it strips
// `$`-prefixed keys and keys containing a dot from req.body / req.query /
// req.params before any handler runs.

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function dangerousKey(key) {
  return key.startsWith('$') || key.includes('.')
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (isPlainObject(item) || Array.isArray(item)) {
        sanitizeValue(item)
      }
    })
    return value
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (dangerousKey(key)) {
        delete value[key]
      } else {
        sanitizeValue(value[key])
      }
    }
  }

  return value
}

function sanitize(req, _res, next) {
  if (req.body) sanitizeValue(req.body)
  if (req.query) sanitizeValue(req.query)
  if (req.params) sanitizeValue(req.params)
  next()
}

module.exports = sanitize;
