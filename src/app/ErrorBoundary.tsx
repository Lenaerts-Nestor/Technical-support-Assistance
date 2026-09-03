import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { CARD, GHOST_BTN_MD, PRIMARY_BTN } from '../shared/ui/styles'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { error: Error | null }

/**
 * Contains a render error to one page. The app is used live during calls, so a
 * bad guide shape that slips past `normalizeGuide` must not blank the screen —
 * the other pages stay mounted and usable behind this.
 *
 * Every page keeps its own boundary and its own state, so "Try again" re-renders
 * in place rather than remounting (which would throw the form away along with
 * the error).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto max-w-[1600px] px-8 py-7">
        <div className={`${CARD} p-6`}>
          <h2 className="text-ink text-lg font-semibold tracking-tight">
            This page hit an error
          </h2>
          <p className="text-ink-muted mt-1 text-sm">
            The other tabs still work — nothing you have open elsewhere is lost.
          </p>
          <pre className="text-ink-faint border-line bg-canvas mt-4 overflow-x-auto rounded-lg border px-3 py-2 text-xs">
            {error.message}
          </pre>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className={PRIMARY_BTN}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={GHOST_BTN_MD}
            >
              Reload the app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
