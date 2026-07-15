// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomerCardDetails } from '../CustomerCardDetails'
import type { CustomerCardEntry } from '@/lib/customers/cardFields'

const entry: CustomerCardEntry = {
  customer_name: 'Queue Guest', customer_type: 'recreational', source: 'walk_in',
  notes: 'Needs consultation', checked_in_at: '2026-07-15T12:00:00.000Z',
  started_at: null, completed_at: null, workflow_event: 'in_store_order',
  guestlist_statuses: { id: 'status-1', name: 'Waiting', color: '#10b981' },
  customers: null, registers: null, online_orders: null,
}

describe('CustomerCardDetails', () => {
  it('renders a configured field on the terminal card surface', () => {
    render(<CustomerCardDetails entry={entry} config={{
      walk_in: { transaction_notes: true },
    }} />)

    expect(screen.getByText('Notes:')).toBeTruthy()
    expect(screen.getByText('Needs consultation')).toBeTruthy()
  })

  it('removes a disabled field from the terminal card surface', () => {
    render(<CustomerCardDetails entry={entry} config={{
      walk_in: { transaction_notes: false },
    }} />)

    expect(screen.queryByText('Needs consultation')).toBeNull()
  })
})
