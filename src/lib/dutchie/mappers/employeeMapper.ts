import type { DutchieEmployee } from '../types'

type EmployeeRole = 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner'

const ROLE_MAP: Record<string, EmployeeRole> = {
  budtender: 'budtender',
  bud_tender: 'budtender',
  cashier: 'budtender',
  shift_lead: 'shift_lead',
  'shift lead': 'shift_lead',
  lead: 'shift_lead',
  manager: 'manager',
  general_manager: 'manager',
  'general manager': 'manager',
  admin: 'admin',
  administrator: 'admin',
  owner: 'owner',
}

const PLACEHOLDER_PIN_HASH = '0000_NEEDS_RESET'

export interface MappedEmployee {
  organization_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: EmployeeRole
  pin_hash: string
  is_active: boolean
  dutchie_employee_id: number
}

export function mapEmployee(
  source: DutchieEmployee,
  organizationId: string,
): MappedEmployee {
  const normalizedRole = source.role?.toLowerCase().trim() ?? ''
  const role: EmployeeRole = ROLE_MAP[normalizedRole] ?? 'budtender'

  return {
    organization_id: organizationId,
    first_name: source.firstName || 'Unknown',
    last_name: source.lastName || 'Employee',
    email: source.email ?? null,
    phone: source.phone ?? null,
    role,
    pin_hash: PLACEHOLDER_PIN_HASH,
    is_active: source.isActive,
    dutchie_employee_id: source.employeeId,
  }
}
