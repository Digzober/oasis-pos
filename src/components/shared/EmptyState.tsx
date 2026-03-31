'use client'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-gray-600">{icon}</div>}
      <h3 className="text-gray-400 font-medium mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-md">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">{action.label}</button>
      )}
    </div>
  )
}
