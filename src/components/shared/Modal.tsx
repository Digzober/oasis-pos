'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; className?: string }

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="shared-modal-title">
      <button className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} aria-label="Close dialog" />
      <div className={cn('relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-edge bg-surface shadow-lg', className)}>
        <header className="flex items-center justify-between border-b border-edge px-5 py-4">
          <h2 id="shared-modal-title" className="font-semibold text-primary">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-primary" aria-label="Close"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5 text-secondary">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-edge bg-raised px-5 py-4">{footer}</footer>}
      </div>
    </div>
  )
}
