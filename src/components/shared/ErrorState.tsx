'use client'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center mb-3">
        <span className="text-danger text-xl">!</span>
      </div>
      <p className="text-secondary mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm px-4 py-2 bg-raised text-secondary rounded-lg hover:bg-raised">Retry</button>
      )}
    </div>
  )
}
