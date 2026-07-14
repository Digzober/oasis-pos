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
      <label htmlFor={name} className="text-[13px] font-medium text-secondary">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {description && !error && <p className="text-xs text-muted">{description}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
