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
              className="h-9 px-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-50 placeholder-gray-500 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          )}
          {toolbar && <div className="flex-1 flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn('border-b border-gray-700 text-gray-400 text-xs uppercase', stickyHeader && 'sticky top-0 bg-gray-800 z-10')}>
                {selectable && (
                  <th className="w-10 px-3 py-3"><input type="checkbox" checked={data.length > 0 && selected.size === data.length} onChange={toggleAll} className="rounded border-gray-600" /></th>
                )}
                {columns.map((col) => (
                  <th key={col.id} className={cn('px-4 py-3', alignClass[col.align ?? 'left'], col.width, col.hideOnMobile && 'hidden md:table-cell',
                    col.sortable && onSort && 'cursor-pointer hover:text-gray-300')}
                    onClick={() => col.sortable && handleSort(col.id)}>
                    <span className="flex items-center gap-1">
                      {col.header}
                      {currentSort?.column === col.id && (
                        <span className="text-emerald-400">{currentSort.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    {selectable && <td className="px-3 py-3"><div className="h-4 w-4 bg-gray-700 rounded animate-pulse" /></td>}
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-4 py-3', col.hideOnMobile && 'hidden md:table-cell')}>
                        <div className="h-4 bg-gray-700 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12">
                    <p className="text-gray-500 mb-2">{emptyMessage}</p>
                    {emptyAction && (
                      <button onClick={emptyAction.onClick} className="text-sm text-emerald-400 hover:text-emerald-300">{emptyAction.label}</button>
                    )}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const rowId = getRowId?.(row) ?? String(i)
                  return (
                    <tr key={rowId}
                      onClick={() => onRowClick?.(row)}
                      className={cn('border-b border-gray-700/50 transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-gray-700/30',
                        rowClassName?.(row))}>
                      {selectable && (
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(rowId)} onChange={() => toggleSelect(rowId)} className="rounded border-gray-600" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{pagination.total} total</span>
              {pagination.onPageSizeChange && (
                <select value={pagination.pageSize} onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-gray-300">
                  {[25, 50, 100].map((s) => <option key={s} value={s}>{s}/page</option>)}
                </select>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Prev</button>
              <span className="px-2 py-1 text-xs text-gray-400">{pagination.page} / {totalPages}</span>
              <button onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.page + 1))} disabled={pagination.page >= totalPages}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
