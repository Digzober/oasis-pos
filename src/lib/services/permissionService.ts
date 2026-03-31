import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

interface CacheEntry { permissions: string[]; fetchedAt: number }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 5 * 60 * 1000

const ROLE_HIERARCHY: Record<string, number> = { budtender: 1, shift_lead: 2, manager: 3, admin: 4, owner: 5 }

export async function getEmployeePermissions(employeeId: string): Promise<string[]> {
  const cached = cache.get(employeeId)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.permissions

  const sb = await createSupabaseServerClient()

  const { data: permRows } = await sb
    .from('user_permission_groups')
    .select('permission_groups!inner ( permission_group_permissions ( permission_definitions!inner ( code ) ) )')
    .eq('employee_id', employeeId)

  const permissions: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (permRows ?? []) as any[]) {
    const group = row.permission_groups
    for (const pgp of group?.permission_group_permissions ?? []) {
      if (pgp.permission_definitions?.code) permissions.push(pgp.permission_definitions.code)
    }
  }

  const unique = [...new Set(permissions)]
  cache.set(employeeId, { permissions: unique, fetchedAt: Date.now() })
  return unique
}

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required)
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((p) => permissions.includes(p))
}

export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every((p) => permissions.includes(p))
}

export async function requirePermission(employeeId: string, permission: string): Promise<void> {
  const perms = await getEmployeePermissions(employeeId)
  if (!perms.includes(permission)) {
    throw new AppError('PERMISSION_DENIED', `Missing permission: ${permission}`, undefined, 403)
  }
}

export async function requireAnyPermission(employeeId: string, permissions: string[]): Promise<void> {
  const perms = await getEmployeePermissions(employeeId)
  if (!permissions.some((p) => perms.includes(p))) {
    throw new AppError('PERMISSION_DENIED', `Missing one of: ${permissions.join(', ')}`, undefined, 403)
  }
}

export async function requireRole(employeeId: string, minRole: string): Promise<void> {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('employees').select('role').eq('id', employeeId).single()
  if (!data) throw new AppError('NOT_FOUND', 'Employee not found', undefined, 404)

  const empLevel = ROLE_HIERARCHY[data.role] ?? 0
  const reqLevel = ROLE_HIERARCHY[minRole] ?? 0
  if (empLevel < reqLevel) {
    throw new AppError('PERMISSION_DENIED', `Requires ${minRole} or higher role`, undefined, 403)
  }
}

export function clearPermissionCache(employeeId?: string) {
  if (employeeId) cache.delete(employeeId)
  else cache.clear()
}
