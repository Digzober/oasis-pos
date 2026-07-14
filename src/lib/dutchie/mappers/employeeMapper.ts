import type { DutchieEmployee } from '../types'

type EmployeeRole = 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner'

// Maps individual Dutchie group names to roles, ordered by privilege (highest wins)
const GROUP_ROLE_MAP: Array<{ pattern: string; role: EmployeeRole }> = [
  { pattern: 'owner', role: 'owner' },
  { pattern: 'admin', role: 'admin' },
  { pattern: 'administrator', role: 'admin' },
  { pattern: 'general manager', role: 'manager' },
  { pattern: 'manager', role: 'manager' },
  { pattern: 'assistant manager', role: 'manager' },
  { pattern: 'shift lead', role: 'shift_lead' },
  { pattern: 'lead', role: 'shift_lead' },
  { pattern: 'supervisor', role: 'shift_lead' },
  { pattern: 'bud tender', role: 'budtender' },
  { pattern: 'budtender', role: 'budtender' },
  { pattern: 'cashier', role: 'budtender' },
]

const ROLE_PRIORITY: Record<EmployeeRole, number> = {
  owner: 4, admin: 3, manager: 2, shift_lead: 1, budtender: 0,
}

function resolveRoleFromGroups(groups: string): EmployeeRole {
  const parts = groups.split(',').map(g => g.trim().toLowerCase())
  let best: EmployeeRole = 'budtender'
  for (const part of parts) {
    for (const { pattern, role } of GROUP_ROLE_MAP) {
      if (part.includes(pattern) && ROLE_PRIORITY[role] > ROLE_PRIORITY[best]) {
        best = role
      }
    }
  }
  return best
}

function placeholderPin(dutchieId: string | number): string {
  return `DUTCHIE_${dutchieId}`
}

export interface MappedEmployee {
  organization_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: EmployeeRole
  pin_hash: string
  is_active: boolean
  dutchie_employee_id: string
}

export function mapEmployee(
  source: DutchieEmployee,
  organizationId: string,
): MappedEmployee {
  // Dutchie returns comma-separated group names like "Bud Tenders, Managers/Assistant Managers"
  const groups = (source as Record<string, unknown>).groups as string | null ?? source.role ?? ''
  const role = resolveRoleFromGroups(groups)

  // Dutchie may return fullName instead of firstName/lastName
  const fullName = (source as Record<string, unknown>).fullName as string | null
  let firstName = source.firstName || ''
  let lastName = source.lastName || ''
  if (!firstName && !lastName && fullName) {
    const parts = fullName.trim().split(/\s+/)
    firstName = parts[0] || 'Unknown'
    lastName = parts.slice(1).join(' ') || ''
  }

  // Dutchie may return status:"Active" instead of isActive:true
  const statusField = (source as Record<string, unknown>).status as string | null
  const isActive = source.isActive ?? (statusField ? statusField.toLowerCase() === 'active' : true)

  // Dutchie may return userId instead of employeeId
  const empId = source.employeeId ?? (source as Record<string, unknown>).userId as number | undefined

  return {
    organization_id: organizationId,
    first_name: firstName || 'Unknown',
    last_name: lastName || 'Employee',
    email: source.email ?? (source as Record<string, unknown>).loginId as string | null ?? null,
    phone: source.phone ?? null,
    role,
    pin_hash: placeholderPin(empId ?? 0),
    is_active: isActive,
    dutchie_employee_id: empId ? String(empId) : '',
  }
}
