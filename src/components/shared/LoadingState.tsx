'use client'

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
