'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
  description?: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  allowCreate?: boolean
  onCreateNew?: (query: string) => void
  createLabel?: string
  loading?: boolean
  disabled?: boolean
}

export function SearchableSelect({
  options, value, onChange, placeholder = 'Select...', searchPlaceholder = 'Search...',
  emptyMessage = 'No results', allowCreate, onCreateNew, createLabel = 'Create new',
  loading, disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 50) : options.slice(0, 50)
  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  return (
    <div className="relative">
      <button type="button" onClick={() => !disabled && setOpen(!open)} disabled={disabled}
        className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-left flex items-center justify-between text-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <span className={selectedOption ? 'text-gray-50' : 'text-gray-500'}>{selectedOption?.label ?? placeholder}</span>
        <span className="text-gray-500 text-xs">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-700">
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder}
                className="w-full h-8 px-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-50 focus:outline-none" />
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? <p className="p-3 text-gray-500 text-xs">Loading...</p>
                : filtered.length === 0 ? (
                  <div className="p-3">
                    <p className="text-gray-500 text-xs">{emptyMessage}</p>
                    {allowCreate && query && (
                      <button onClick={() => { onCreateNew?.(query); setOpen(false); setQuery('') }}
                        className="mt-1 text-xs text-emerald-400 hover:text-emerald-300">+ {createLabel} "{query}"</button>
                    )}
                  </div>
                ) : filtered.map((opt) => (
                  <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQuery('') }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${opt.value === value ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {opt.label}
                    {opt.description && <span className="text-xs text-gray-500 ml-2">{opt.description}</span>}
                  </button>
                ))}
              {allowCreate && query && filtered.length > 0 && (
                <button onClick={() => { onCreateNew?.(query); setOpen(false); setQuery('') }}
                  className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-gray-700 border-t border-gray-700">+ {createLabel} "{query}"</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
