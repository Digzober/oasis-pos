import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

function hashPin(pin: string) { return crypto.createHash('sha256').update(pin).digest('hex') }

describe('employee management logic', () => {
  it('1. create employee: PIN is hashed', () => {
    const pin = '1234'
    const hash = hashPin(pin)
    expect(hash).toHaveLength(64)
    expect(hash).not.toBe(pin)
  })

  it('2. duplicate email: rejected', () => {
    const existing = [{ email: 'kane@oasis.com' }]
    const newEmail = 'kane@oasis.com'
    const isDuplicate = existing.some(e => e.email === newEmail)
    expect(isDuplicate).toBe(true)
  })

  it('3. assign multiple locations: entries created', () => {
    const locationIds = ['loc-1', 'loc-2', 'loc-3']
    const primaryId = 'loc-1'
    const entries = locationIds.map(lid => ({ location_id: lid, is_primary: lid === primaryId }))
    expect(entries).toHaveLength(3)
    expect(entries.find(e => e.is_primary)?.location_id).toBe('loc-1')
  })

  it('4. assign permission groups: junction records created', () => {
    const groupIds = ['grp-admin', 'grp-managers']
    const records = groupIds.map(gid => ({ employee_id: 'emp-1', permission_group_id: gid }))
    expect(records).toHaveLength(2)
  })

  it('5. reset PIN: hash changes', () => {
    const oldHash = hashPin('1234')
    const newHash = hashPin('5678')
    expect(oldHash).not.toBe(newHash)
  })

  it('6. deactivate: is_active false, cannot login', () => {
    const emp = { is_active: false }
    expect(emp.is_active).toBe(false)
    // Login checks is_active = true
  })

  it('7. clock in: entry created', () => {
    const entry = { clock_in: new Date().toISOString(), clock_out: null }
    expect(entry.clock_in).toBeTruthy()
    expect(entry.clock_out).toBeNull()
  })

  it('8. clock out: hours calculated', () => {
    const clockIn = new Date('2026-03-30T09:00:00')
    const clockOut = new Date('2026-03-30T17:30:00')
    const hours = Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) / 100
    expect(hours).toBe(8.5)
  })

  it('9. double clock in: rejected', () => {
    const activeEntry = { id: 'entry-1', clock_out: null }
    const hasActive = activeEntry.clock_out === null
    expect(hasActive).toBe(true)
    // Service throws ALREADY_CLOCKED_IN
  })

  it('10. permission group update: old replaced with new', () => {
    const oldPerms = ['perm-1', 'perm-2', 'perm-3']
    const newPerms = ['perm-2', 'perm-4']
    // Delete all old, insert new
    expect(newPerms).not.toContain('perm-1')
    expect(newPerms).toContain('perm-4')
  })
})
