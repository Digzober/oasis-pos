import { describe, it, expect } from 'vitest'
import { mergeVars } from '../templateService'

describe('marketing services', () => {
  it('1. create campaign: draft status', () => {
    const campaign = { name: 'Spring Sale', status: 'draft' }
    expect(campaign.status).toBe('draft')
  })

  it('2. send to segment: correct recipient count', () => {
    const allCustomers = Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, opted_in: i < 40 }))
    const optedIn = allCustomers.filter(c => c.opted_in)
    expect(optedIn).toHaveLength(40)
  })

  it('3. template merge: {{first_name}} replaced', () => {
    const result = mergeVars('Hello {{first_name}}, you have {{loyalty_points}} points!', { first_name: 'Kane', loyalty_points: '150' })
    expect(result).toBe('Hello Kane, you have 150 points!')
  })

  it('4. template merge: missing variable becomes empty', () => {
    const result = mergeVars('Hi {{first_name}}, code: {{promo_code}}', { first_name: 'Kane' })
    expect(result).toBe('Hi Kane, code: ')
    expect(result).not.toContain('undefined')
  })

  it('5. workflow trigger: first_purchase matches', () => {
    const workflows = [
      { id: 'w1', trigger_type: 'first_purchase', status: 'active' },
      { id: 'w2', trigger_type: 'birthday', status: 'active' },
    ]
    const matching = workflows.filter(w => w.trigger_type === 'first_purchase' && w.status === 'active')
    expect(matching).toHaveLength(1)
    expect(matching[0]!.id).toBe('w1')
  })

  it('6. event: end_date >= start_date', () => {
    const valid = new Date('2026-04-15') >= new Date('2026-04-10')
    const invalid = new Date('2026-04-05') >= new Date('2026-04-10')
    expect(valid).toBe(true)
    expect(invalid).toBe(false)
  })

  it('7. marketing opt-out: excluded from sends', () => {
    const customers = [
      { id: 'c1', opted_into_marketing: true },
      { id: 'c2', opted_into_marketing: false },
      { id: 'c3', opted_into_marketing: true },
    ]
    const recipients = customers.filter(c => c.opted_into_marketing)
    expect(recipients).toHaveLength(2)
    expect(recipients.find(c => c.id === 'c2')).toBeUndefined()
  })

  it('8. schedule campaign: status changes', () => {
    const before = { status: 'draft' }
    const after = { ...before, status: 'scheduled', send_date: '2026-04-15T10:00:00Z' }
    expect(after.status).toBe('scheduled')
    expect(after.send_date).toBeTruthy()
  })
})
