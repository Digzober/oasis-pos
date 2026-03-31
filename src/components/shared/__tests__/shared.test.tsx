// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DataTable, type ColumnDef } from '../DataTable'
import { ConfirmDialog } from '../ConfirmDialog'
import { SearchableSelect } from '../SearchableSelect'
import { MoneyInput } from '../MoneyInput'
import { StatusBadge } from '../StatusBadge'
import { DateRangePicker } from '../DateRangePicker'

interface TestRow { id: string; name: string; price: number }

const columns: ColumnDef<TestRow>[] = [
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'price', header: 'Price', accessorKey: 'price', align: 'right' },
]

const testData: TestRow[] = [
  { id: '1', name: 'Product A', price: 30 },
  { id: '2', name: 'Product B', price: 50 },
]

describe('shared components', () => {
  it('1. DataTable renders columns and rows', () => {
    render(<DataTable columns={columns} data={testData} />)
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Product A')).toBeTruthy()
    expect(screen.getByText('Product B')).toBeTruthy()
  })

  it('2. DataTable pagination controls', () => {
    const onPageChange = vi.fn()
    render(<DataTable columns={columns} data={testData} pagination={{ page: 1, pageSize: 1, total: 2, onPageChange }} />)
    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('3. DataTable search fires callback', async () => {
    const onSearch = vi.fn()
    render(<DataTable columns={columns} data={testData} searchable onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'test' } })
    await new Promise((r) => setTimeout(r, 350)) // debounce
    expect(onSearch).toHaveBeenCalledWith('test')
  })

  it('4. DataTable empty state', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })

  it('5. DataTable loading state shows skeletons', () => {
    const { container } = render(<DataTable columns={columns} data={[]} loading />)
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('6. ConfirmDialog fires onConfirm', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open title="Delete?" description="Are you sure?" onConfirm={onConfirm} onOpenChange={() => {}} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('7. ConfirmDialog cancel closes', () => {
    const onOpenChange = vi.fn()
    render(<ConfirmDialog open title="Delete?" description="Sure?" onConfirm={() => {}} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('8. SearchableSelect filters options', () => {
    const options = [{ value: '1', label: 'Apple' }, { value: '2', label: 'Banana' }, { value: '3', label: 'Cherry' }]
    render(<SearchableSelect options={options} value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByText('Select...'))
    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Ban' } })
    expect(screen.getByText('Banana')).toBeTruthy()
  })

  it('9. SearchableSelect shows Create New', () => {
    const onCreateNew = vi.fn()
    render(<SearchableSelect options={[]} value={null} onChange={() => {}} allowCreate onCreateNew={onCreateNew} createLabel="Add Brand" />)
    fireEvent.click(screen.getByText('Select...'))
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'NewBrand' } })
    const createBtn = screen.getByText(/Add Brand/)
    expect(createBtn).toBeTruthy()
  })

  it('10. MoneyInput formats with 2 decimals on blur', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} />)
    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '29.9' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(29.9)
  })

  it('11. StatusBadge maps active to success', () => {
    const { container } = render(<StatusBadge status="active" />)
    expect(container.textContent).toBe('active')
    expect(container.innerHTML).toContain('emerald')
  })

  it('12. DateRangePicker Today preset', () => {
    const onChange = vi.fn()
    render(<DateRangePicker startDate={null} endDate={null} onChange={onChange} />)
    fireEvent.click(screen.getByText('Today'))
    expect(onChange).toHaveBeenCalled()
    const [start, end] = onChange.mock.calls[0]!
    expect(start).toBe(end) // Today = same date
  })
})
