import { describe, expect, it } from 'vitest'
import {
  buildCustomerFieldVisibilityPatch,
  getCustomerFieldState,
  validateRequiredCustomerFields,
} from '../fieldVisibility'

describe('customer field visibility', () => {
  it('shows unspecified fields and honors hide and required states', () => {
    expect(getCustomerFieldState({}, 'pos', 'email')).toEqual({ visible: true, required: false })
    expect(getCustomerFieldState({ pos: { email: 'hide' } }, 'pos', 'email')).toEqual({ visible: false, required: false })
    expect(getCustomerFieldState({ backend: { email: 'required' } }, 'backend', 'email')).toEqual({ visible: true, required: true })
  })

  it('preserves intrinsic requirements while consuming visibility', () => {
    expect(getCustomerFieldState({ pos: { dob: 'show' } }, 'pos', 'dob', true)).toEqual({ visible: true, required: true })
    expect(getCustomerFieldState({ pos: { dob: 'hide' } }, 'pos', 'dob', true)).toEqual({ visible: true, required: true })
  })

  it('reports configured required fields that are blank', () => {
    const missing = validateRequiredCustomerFields(
      { pos: { phone: 'required', email: 'show', mmj_id: 'required' } },
      'pos',
      { phone: '', email: '', mmj_id: 'MMJ-1' },
    )
    expect(missing).toEqual(['phone'])
  })

  it('builds a leaf-only patch for atomic visibility writes', () => {
    expect(buildCustomerFieldVisibilityPatch('backend', 'notes', 'hide')).toEqual({
      customer_field_visibility: { backend: { notes: 'hide' } },
    })
  })
})
