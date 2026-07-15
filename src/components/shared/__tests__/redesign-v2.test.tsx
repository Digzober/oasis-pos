// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../Button'
import { DataTable, type ColumnDef } from '../DataTable'
import { Input } from '../Input'
import { Select } from '../Select'
import { StatCard } from '../StatCard'

interface Row {
  id: string
  product: string
  quantity: number
}

const columns: ColumnDef<Row>[] = [
  { id: 'product', header: 'Product', accessorKey: 'product' },
  { id: 'quantity', header: 'Quantity', accessorKey: 'quantity', align: 'right' },
]

const denseBespokeTablePages = [
  'src/app/(backoffice)/customers/page.tsx',
  'src/app/(backoffice)/customers/configure/fields/page.tsx',
  'src/app/(backoffice)/customers/groups/page.tsx',
  'src/app/(backoffice)/customers/segments/page.tsx',
  'src/app/(backoffice)/delivery/page.tsx',
  'src/app/(backoffice)/employees/page.tsx',
  'src/app/(backoffice)/employees/time-clock/page.tsx',
  'src/app/(backoffice)/inventory/page.tsx',
  'src/app/(backoffice)/inventory/audits/page.tsx',
  'src/app/(backoffice)/inventory/journal/page.tsx',
  'src/app/(backoffice)/inventory/manifests/page.tsx',
  'src/app/(backoffice)/inventory/purchase-orders/page.tsx',
  'src/app/(backoffice)/inventory/transfers/page.tsx',
  'src/app/(backoffice)/marketing/campaigns/page.tsx',
  'src/app/(backoffice)/marketing/discounts/page.tsx',
  'src/app/(backoffice)/marketing/events/page.tsx',
  'src/app/(backoffice)/marketing/workflows/page.tsx',
  'src/app/(backoffice)/orders/page.tsx',
  'src/app/(backoffice)/products/page.tsx',
  'src/app/(backoffice)/products/smart-tags/page.tsx',
  'src/app/(backoffice)/reports/cogs/page.tsx',
  'src/app/(backoffice)/reports/inventory/page.tsx',
  'src/app/(backoffice)/reports/schedules/page.tsx',
  'src/app/(backoffice)/reports/transactions/page.tsx',
  'src/app/(backoffice)/settings/biotrack/page.tsx',
  'src/app/(backoffice)/settings/labels/page.tsx',
  'src/app/(backoffice)/settings/locations/page.tsx',
  'src/app/(backoffice)/settings/taxes/page.tsx',
]

describe('Redesign v2 shared component contract', () => {
  it('renders a dense stat card and only shows a trend for real delta data', () => {
    const { container, rerender } = render(
      <StatCard label="Net sales" value="$12,345.67" icon={<svg aria-label="sales icon" />} />,
    )

    expect(screen.getByText('Net sales').className).toContain('text-[11px]')
    expect(screen.getByText('$12,345.67').className).toContain('text-[22px]')
    expect(container.querySelector('[data-trend]')).toBeNull()

    rerender(<StatCard label="Net sales" value="$12,345.67" delta={8.4} icon={<svg aria-label="sales icon" />} />)
    expect(screen.getByText('▲ 8.4%').getAttribute('data-trend')).toBe('positive')

    rerender(<StatCard label="Net sales" value="$12,345.67" delta={-2.1} icon={<svg aria-label="sales icon" />} />)
    expect(screen.getByText('▼ 2.1%').getAttribute('data-trend')).toBe('negative')
  })

  it('renders dense table hierarchy and tabular right-aligned numeric cells', () => {
    const { container } = render(
      <DataTable columns={columns} data={[{ id: '1', product: 'Flower', quantity: 24 }]} getRowId={row => row.id} />,
    )

    const header = container.querySelector('thead')
    const row = screen.getByText('Flower').closest('tr')
    const numericCell = screen.getByText('24').closest('td')
    expect(header?.className).toContain('sticky')
    expect(header?.className).toContain('bg-raised')
    expect(row?.className).toContain('h-9')
    expect(row?.className).toContain('border-edge')
    expect(row?.className).toContain('hover:bg-raised/60')
    expect(numericCell?.className).toContain('tabular-nums')
    expect(numericCell?.className).toContain('py-1.5')
  })

  it('uses the compact shared control vocabulary', () => {
    render(
      <>
        <Button>Save</Button>
        <Input aria-label="Name" />
        <Select aria-label="Status"><option>Active</option></Select>
      </>,
    )

    expect(screen.getByRole('button', { name: 'Save' }).className).toMatch(/h-8.*rounded-sm|rounded-sm.*h-8/)
    expect(screen.getByLabelText('Name').className).toMatch(/h-9.*bg-surface|bg-surface.*h-9/)
    expect(screen.getByLabelText('Status').className).toContain('rounded-sm')
  })

  it('keeps the registry architecture while enforcing the approved token and shell direction', () => {
    const hex = (value: string) => `#${value}`
    const globals = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
    const registry = readFileSync(resolve(process.cwd(), 'src/lib/theme/registry.ts'), 'utf8')
    const sidebar = readFileSync(resolve(process.cwd(), 'src/components/backoffice/Sidebar.tsx'), 'utf8')
    const header = readFileSync(resolve(process.cwd(), 'src/components/backoffice/BackofficeHeader.tsx'), 'utf8')
    const dashboard = readFileSync(resolve(process.cwd(), 'src/app/(backoffice)/dashboard/page.tsx'), 'utf8')

    expect(registry).toContain("id: 'oasis-dark'")
    expect(globals).toContain(`--surface: ${hex('19221e')}`)
    expect(globals).toContain(`--surface-raised: ${hex('24312c')}`)
    expect(globals).toContain(`--edge: ${hex('486054')}`)
    expect(globals).toContain('--radius-token-sm: 0.1875rem')
    expect(sidebar).toContain('before:w-0.5')
    expect(sidebar).toContain('bg-accent-soft')
    expect(header).toContain('h-12')
    expect(header).toContain('border-edge-strong')
    expect(dashboard.match(/icon=\{</g)).toHaveLength(5)
    expect(dashboard).not.toContain('delta=')
  })

  it('keeps every audited bespoke list table to one compact line per row', () => {
    const densityClass = readFileSync(resolve(process.cwd(), 'src/lib/constants/tableDensity.ts'), 'utf8')

    expect(densityClass).toContain('[&_th]:py-2!')
    expect(densityClass).toContain('[&_th]:text-[11px]!')
    expect(densityClass).toContain('[&_td]:py-2!')
    expect(densityClass).toContain('[&_td]:align-middle')
    expect(densityClass).toContain('[&_td]:text-[13px]!')
    expect(densityClass).toContain('[&_td]:whitespace-nowrap')
    expect(densityClass).toContain('[&_tbody_tr]:border-edge!')
    expect(densityClass).toContain('[&_tbody_tr:hover]:bg-raised/50!')

    for (const file of denseBespokeTablePages) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      const tableCount = source.match(/<table\b/g)?.length ?? 0
      const densityMarkerCount = source.match(/data-density="compact"/g)?.length ?? 0

      expect(densityMarkerCount, file).toBe(tableCount)
      expect(source, file).toContain('DENSE_BESPOKE_TABLE_CLASS')
    }
  })
})
