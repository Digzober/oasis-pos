'use client'

import { useState, useRef, useEffect } from 'react'
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
  onRowClick, rowClassName, stickyHeader, getRowId,
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

  return (
    <div className="space-y-3">
      {/* Toolbar row */}
      {(searchable || toolbar) && (
        <div className="flex items-center gap-3">
          {searchable && (
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 px-3 bg-surface border border-edge rounded-lg text-sm text-primary placeholder:text-muted w-64 focus:outline-none focus:ring-2 focus:ring-accent" />
          )}
          {toolbar && <div className="flex-1 flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn('border-b border-edge text-secondary text-xs uppercase', stickyHeader && 'sticky top-0 bg-surface z-10')}>
                {selectable && (
                  <th className="w-10 px-3 py-3"><input type="checkbox" checked={data.length > 0 && selected.size === data.length} onChange={toggleAll} className="rounded border-edge-strong" /></th>
                )}
                {columns.map((col) => (
                  <th key={col.id} className={cn('px-4 py-3', alignClass[col.align ?? 'left'], col.width, col.hideOnMobile && 'hidden md:table-cell',
                    col.sortable && onSort && 'cursor-pointer hover:text-secondary')}
                    onClick={() => col.sortable && handleSort(col.id)}>
                    <span className="flex items-center gap-1">
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
                  <tr key={i} className="border-b border-edge/50">
                    {selectable && <td className="px-3 py-3"><div className="h-4 w-4 bg-raised rounded animate-pulse" /></td>}
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-4 py-3', col.hideOnMobile && 'hidden md:table-cell')}>
                        <div className="h-4 bg-raised rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
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
                      className={cn('border-b border-edge/50 transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-raised/30',
                        rowClassName?.(row))}>
                      {selectable && (
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(rowId)} onChange={() => toggleSelect(rowId)} className="rounded border-edge-strong" />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.id} className={cn('px-4 py-2.5', alignClass[col.align ?? 'left'], col.hideOnMobile && 'hidden md:table-cell')}>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span>{pagination.total} total</span>
              {pagination.onPageSizeChange && (
                <select value={pagination.pageSize} onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="bg-bg border border-edge rounded px-1 py-0.5 text-secondary">
                  {[25, 50, 100].map((s) => <option key={s} value={s}>{s}/page</option>)}
                </select>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                className="px-2 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40">Prev</button>
              <span className="px-2 py-1 text-xs text-secondary">{pagination.page} / {totalPages}</span>
              <button onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.page + 1))} disabled={pagination.page >= totalPages}
                className="px-2 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
