import crypto from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

export interface CreateEmployeeInput {
  organization_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  pin: string
  role: string
  location_ids: string[]
  primary_location_id: string
  permission_group_ids: string[]
}

export interface UpdateEmployeeInput {
  first_name?: string
  last_name?: string
  email?: string | null
  phone?: string | null
  role?: string
}

export async function listEmployees(orgId: string, filters?: { search?: string; location_id?: string; role?: string; status?: string; page?: number; per_page?: number }) {
  const sb = await createSupabaseServerClient()
  const page = filters?.page ?? 1
  const perPage = filters?.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = sb.from('employees').select('*, employee_locations ( location_id, is_primary, locations ( name ) ), user_permission_groups ( permission_groups ( id, name ) )', { count: 'exact' }).eq('organization_id', orgId)

  if (filters?.search) query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  if (filters?.role) query = query.eq('role', filters.role)
  if (filters?.status === 'active') query = query.eq('is_active', true)
  else if (filters?.status === 'inactive') query = query.eq('is_active', false)

  const { data, count, error } = await query.order('last_name').range(offset, offset + perPage - 1)
  if (error) { logger.error('Employee list failed', { error: error.message }); return { employees: [], total: 0 } }
  return { employees: data ?? [], total: count ?? 0 }
}

export async function getEmployeeProfile(id: string) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('employees').select('*, employee_locations ( location_id, is_primary, locations ( id, name ) ), user_permission_groups ( permission_group_id, permission_groups ( id, name ) )').eq('id', id).single()
  if (error || !data) throw new AppError('NOT_FOUND', 'Employee not found', error, 404)
  return data
}

export async function createEmployee(input: CreateEmployeeInput) {
  const sb = await createSupabaseServerClient()

  // Check duplicate email
  if (input.email) {
    const { data: dup } = await sb.from('employees').select('id').eq('organization_id', input.organization_id).eq('email', input.email).eq('is_active', true).maybeSingle()
    if (dup) throw new AppError('DUPLICATE_EMAIL', 'An employee with this email already exists', undefined, 409)
  }

  // Check PIN collision at primary location
  const pinHash = hashPin(input.pin)
  const { data: pinDup } = await sb.from('employees').select('id').eq('organization_id', input.organization_id).eq('pin_hash', pinHash).eq('is_active', true).maybeSingle()
  if (pinDup) throw new AppError('PIN_COLLISION', 'Another employee already uses this PIN', undefined, 409)

  const { data: employee, error } = await sb.from('employees').insert({
    organization_id: input.organization_id,
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    pin_hash: pinHash,
    role: input.role,
  }).select().single()

  if (error) throw new AppError('CREATE_FAILED', 'Failed to create employee', error, 500)

  // Assign locations
  if (input.location_ids.length > 0) {
    await sb.from('employee_locations').insert(
      input.location_ids.map((lid) => ({ employee_id: employee.id, location_id: lid, is_primary: lid === input.primary_location_id }))
    )
  }

  // Assign permission groups
  if (input.permission_group_ids.length > 0) {
    await sb.from('user_permission_groups').insert(
      input.permission_group_ids.map((gid) => ({ employee_id: employee.id, permission_group_id: gid }))
    )
  }

  return employee
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('employees').update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', 'Failed to update employee', error, 500)
  return data
}

export async function resetPin(id: string, newPin: string, employeeId: string) {
  const sb = await createSupabaseServerClient()
  const pinHash = hashPin(newPin)

  // Check collision
  const { data: emp } = await sb.from('employees').select('organization_id').eq('id', id).single()
  if (!emp) throw new AppError('NOT_FOUND', 'Employee not found', undefined, 404)

  const { data: dup } = await sb.from('employees').select('id').eq('organization_id', emp.organization_id).eq('pin_hash', pinHash).eq('is_active', true).neq('id', id).maybeSingle()
  if (dup) throw new AppError('PIN_COLLISION', 'Another employee already uses this PIN', undefined, 409)

  await sb.from('employees').update({ pin_hash: pinHash }).eq('id', id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({ organization_id: emp.organization_id, employee_id: employeeId, entity_type: 'employee', event_type: 'pin_reset', entity_id: id } as any)
}

export async function deactivateEmployee(id: string, reason: string, employeeId: string) {
  const sb = await createSupabaseServerClient()
  await sb.from('employees').update({ is_active: false }).eq('id', id)
  const { data: emp } = await sb.from('employees').select('organization_id').eq('id', id).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (emp) await sb.from('audit_log').insert({ organization_id: emp.organization_id, employee_id: employeeId, entity_type: 'employee', event_type: 'deactivate', entity_id: id, metadata: { reason } } as any)
}

export async function assignLocations(employeeId: string, locationIds: string[], primaryLocationId: string) {
  const sb = await createSupabaseServerClient()
  await sb.from('employee_locations').delete().eq('employee_id', employeeId)
  if (locationIds.length > 0) {
    await sb.from('employee_locations').insert(
      locationIds.map((lid) => ({ employee_id: employeeId, location_id: lid, is_primary: lid === primaryLocationId }))
    )
  }
}

export async function assignPermissionGroups(employeeId: string, groupIds: string[]) {
  const sb = await createSupabaseServerClient()
  await sb.from('user_permission_groups').delete().eq('employee_id', employeeId)
  if (groupIds.length > 0) {
    await sb.from('user_permission_groups').insert(groupIds.map((gid) => ({ employee_id: employeeId, permission_group_id: gid })))
  }
}
