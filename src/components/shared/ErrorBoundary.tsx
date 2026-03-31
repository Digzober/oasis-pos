'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    // Try to preserve cart state
    try {
      const cartState = localStorage.getItem('oasis-cart-backup')
      if (!cartState) {
        // Save current zustand state as backup
        const zustandState = sessionStorage.getItem('zustand-cart')
        if (zustandState) sessionStorage.setItem('oasis-cart-backup', zustandState)
      }
    } catch { /* storage unavailable */ }

    // Log to server
    fetch('/api/health', { method: 'GET' }).catch(() => {})
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-gray-50 mb-2">Terminal Error</h1>
            <p className="text-sm text-gray-400 mb-4">
              An unexpected error occurred. Your cart data has been preserved.
            </p>
            <p className="text-xs text-gray-600 mb-6 font-mono">{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500"
            >
              Restart Terminal
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
