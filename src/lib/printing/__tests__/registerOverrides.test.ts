import { describe, expect, it } from 'vitest'
import { parseRegisterPrintOverride } from '../registerOverrides'

describe('register print override input', () => {
  it.each([
    ['', null], [null, null], ['true', true], [true, true],
    ['false', false], [false, false],
  ])('maps %j to %j', (input, expected) => {
    expect(parseRegisterPrintOverride(input)).toBe(expected)
  })

  it('rejects an invalid override representation', () => {
    expect(() => parseRegisterPrintOverride('sometimes')).toThrow('Invalid register print override')
  })
})
