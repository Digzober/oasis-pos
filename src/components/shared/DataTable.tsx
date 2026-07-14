'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface ColumnDef<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void }
  sortable?: boolean
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  currentSort?: { column: string; direction: 'asc' | 'desc' }
  selectable?: boolean
  onSelectionChange?: (selectedIds: string[]) => void
  loading?: boolean
  emptyMessage?: string
  emptyAction?: { label: string; onClick: () => void }
  toolbar?: React.ReactNode
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  stickyHeader?: boolean
  getRowId?: (row: T) => string
}

export function DataTable<T>({
  columns, data, searchable, searchPlaceholder = 'Search...', onSearch,
  pagination, onSort, currentSort, selectable, onSelectionChange,
  loading, emptyMessage = 'No data found', emptyAction, toolbar,
  onRowClick, rowClassName, stickyHeader = true, getRowId,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSearch = (value: string) => {
    setSearch(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearch?.(value), 300)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
    onSelectionChange?.(Array.from(next))
  }

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set())
      onSelectionChange?.([])
    } else {
      const all = new Set(data.map((r, i) => getRowId?.(r) ?? String(i)))
      setSelected(all)
      onSelectionChange?.(Array.from(all))
    }
  }

  const handleSort = (colId: string) => {
    if (!onSort) return
    const dir = currentSort?.column === colId && currentSort.direction === 'asc' ? 'desc' : 'asc'
    onSort(colId, dir)
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0
  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }
  const alignFlexClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }

  return (
    <div className="space-y-3">
      {/* Toolbar row */}
      {(searchable || toolbar) && (
        <div className="flex items-center gap-3">
          {searchable && (
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-64 rounded-sm border border-edge bg-surface px-3 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring/25" />
          )}
          {toolbar && <div className="flex-1 flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-edge bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-secondary">
            <thead className={cn('bg-raised', stickyHeader && 'sticky top-0 z-10')}>
              <tr className="border-b border-edge-strong text-[11px] font-semibold uppercase tracking-wide text-muted">
                {selectable && (
                  <th className="w-9 px-3 py-2"><input type="checkbox" checked={data.length > 0 && selected.size === data.length} onChange={toggleAll} className="rounded-sm border-edge-strong accent-accent" /></th>
                )}
                {columns.map((col) => (
                  <th key={col.id} className={cn('px-3 py-2', alignClass[col.align ?? 'left'], col.width, col.hideOnMobile && 'hidden md:table-cell',
                    col.sortable && onSort && 'cursor-pointer hover:text-primary')}
                    onClick={() => col.sortable && handleSort(col.id)}>
                    <span className={cn('flex items-center gap-1', alignFlexClass[col.align ?? 'left'])}>
                      {col.header}
                      {currentSort?.column === col.id && (
                        <span className="text-accent">{currentSort.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="h-9 border-b border-edge">
                    {selectable && <td className="px-3 py-1.5"><div className="h-4 w-4 animate-pulse rounded-sm bg-raised" /></td>}
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-3 py-1.5', col.hideOnMobile && 'hidden md:table-cell')}>
                        <div className="h-4 animate-pulse rounded-sm bg-raised" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12">
                    <p className="text-muted mb-2">{emptyMessage}</p>
                    {emptyAction && (
                      <button onClick={emptyAction.onClick} className="text-sm text-accent hover:text-accent">{emptyAction.label}</button>
                    )}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const rowId = getRowId?.(row) ?? String(i)
                  return (
                    <tr key={rowId}
                      onClick={() => onRowClick?.(row)}
                      className={cn('h-9 border-b border-edge transition-colors hover:bg-raised/60',
                        selected.has(rowId) && 'bg-accent-soft',
                        onRowClick && 'cursor-pointer',
                        rowClassName?.(row))}>
                      {selectable && (
                        <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(rowId)} onChange={() => toggleSelect(rowId)} className="rounded-sm border-edge-strong accent-accent" />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.id} className={cn(
                          'px-3 py-1.5',
                          alignClass[col.align ?? 'left'],
                          col.align === 'right' && 'tabular-nums',
                          col.hideOnMobile && 'hidden md:table-cell',
                        )}>
                          {col.cell ? col.cell(row) : col.accessorKey ? String((row as Record<string, unknown>)[col.accessorKey as string] ?? '') : ''}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-edge px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span>{pagination.total} total</span>
              {pagination.onPageSizeChange && (
                <select value={pagination.pageSize} onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="rounded-sm border border-edge bg-surface px-1 py-0.5 text-secondary">
                  {[25, 50, 100].map((s) => <option key={s} value={s}>{s}/page</option>)}
                </select>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                className="rounded-sm border border-edge bg-raised px-2 py-1 text-xs text-secondary disabled:opacity-40">Prev</button>
              <span className="px-2 py-1 text-xs tabular-nums text-muted">{pagination.page} / {totalPages}</span>
              <button onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.page + 1))} disabled={pagination.page >= totalPages}
                className="rounded-sm border border-edge bg-raised px-2 py-1 text-xs text-secondary disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
