import { Component } from 'react'

// Phase 13 - last line of defence on the client.
// If any component throws while rendering, React unmounts the whole tree and
// the user is left with a blank page. This boundary catches the error instead
// and renders a recoverable screen. Details go to the console only - the same
// rule the API follows (never expose stack traces to the user).
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <section className="page-section">
        <div className="container text-center">
          <span className="display-6 fw-bold text-success">!</span>
          <h1 className="h3 mt-2 mb-3">Something went wrong</h1>
          <p className="text-muted mb-4">
            An unexpected error stopped this page from loading. Reloading usually fixes it.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <button type="button" className="btn btn-success" onClick={this.handleReload}>
              Reload page
            </button>
            <a href="/" className="btn btn-outline-secondary">
              Back to home
            </a>
          </div>
        </div>
      </section>
    )
  }
}
