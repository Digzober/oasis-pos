import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border-edge bg-raised text-primary hover:border-edge-strong hover:bg-overlay',
  ghost: 'border-transparent bg-transparent text-secondary hover:bg-raised hover:text-primary',
  danger: 'border-transparent bg-danger text-inverse hover:opacity-90',
}

const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-base' }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props }, ref,
) {
  return <button ref={ref} type={type} className={cn(
    'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition disabled:pointer-events-none disabled:opacity-50',
    variants[variant], sizes[size], className,
  )} {...props} />
})
