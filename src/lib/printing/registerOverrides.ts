const PRINT_OVERRIDE_KEYS = ['auto_print_receipts', 'auto_print_labels'] as const

export function parseRegisterPrintOverride(value: unknown): boolean | null {
  if (value === '' || value === null || value === undefined) return null
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw new Error('Invalid register print override')
}

export function normalizeRegisterPrintOverrides(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = { ...input }
  for (const key of PRINT_OVERRIDE_KEYS) {
    if (Object.hasOwn(input, key)) {
      normalized[key] = parseRegisterPrintOverride(input[key])
    }
  }
  return normalized
}
