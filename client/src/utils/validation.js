// Turns Axios errors into messages that can be shown to the user.
export function getApiErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error?.response) {
    const { status, data } = error.response

    // Prefer the message the API sent; only fall back per status code.
    if (data?.message) {
      return data.message
    }

    const byStatus = {
      400: 'The information you entered is not valid. Please review the highlighted fields.',
      401: 'Your session has expired. Please sign in again.',
      403: 'You do not have permission to do that.',
      404: 'The requested record was not found.',
      409: 'That record already exists or conflicts with the current state.',
      413: 'The request was too large. Please reduce the amount of data and try again.',
      429: 'Too many requests - please wait a moment and try again.',
    }

    if (status >= 500) {
      return 'The server ran into a problem. Please try again in a moment.'
    }

    return byStatus[status] || fallback
  }

  if (error?.request) {
    return 'Cannot reach the server. Please check that the backend is running and try again.'
  }

  return error?.message || fallback
}

// Minimal client-side validation shared by the auth forms.
// Returns an object of field -> message (empty object means valid).
export function validateAuthForm({ name, email, password, confirmPassword, role }, { isRegister }) {
  const errors = {}

  if (isRegister && !name?.trim()) {
    errors.name = 'Name is required.'
  }
  if (!email?.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }
  if (isRegister) {
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    if (!role) {
      errors.role = 'Please choose an account type.'
    }
  }

  return errors
}
