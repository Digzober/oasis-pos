'use client'

interface FormFieldProps {
  label: string
  name: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, name, description, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm text-gray-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {description && !error && <p className="text-xs text-gray-500">{description}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
