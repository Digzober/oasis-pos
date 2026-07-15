export type FieldVisibility = 'required' | 'show' | 'hide'
export type CustomerFieldSurface = 'pos' | 'backend'
export type CustomerFieldVisibility = Partial<
  Record<CustomerFieldSurface, Record<string, FieldVisibility>>
>

export interface CustomerFieldState {
  visible: boolean
  required: boolean
}

export function getCustomerFieldState(
  config: CustomerFieldVisibility,
  surface: CustomerFieldSurface,
  field: string,
  intrinsicallyRequired = false,
): CustomerFieldState {
  const visibility = config[surface]?.[field] ?? 'show'
  return {
    visible: intrinsicallyRequired || visibility !== 'hide',
    required: intrinsicallyRequired || visibility === 'required',
  }
}

export function validateRequiredCustomerFields(
  config: CustomerFieldVisibility,
  surface: CustomerFieldSurface,
  values: Record<string, string>,
): string[] {
  return Object.entries(config[surface] ?? {}).flatMap(([field, visibility]) => (
    visibility === 'required' && Object.hasOwn(values, field) && !values[field]?.trim()
      ? [field]
      : []
  ))
}

export function buildCustomerFieldVisibilityPatch(
  surface: CustomerFieldSurface,
  field: string,
  visibility: FieldVisibility,
) {
  return { customer_field_visibility: { [surface]: { [field]: visibility } } }
}
