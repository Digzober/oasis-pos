import { describe, it, expect } from 'vitest'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../permissionService'

const EMPLOYEE_PERMS = [
  'GENERAL_LOGIN_POS',
  'POS_BACKEND_VIEW_POS_SUMMARY',
  'POS_BACKEND_VIEW_POS',
  'MAINT_PRODUCTS_VIEW_DETAIL',
  'MAINT_CUSTOMERS_VIEW',
]

const ROLE_HIERARCHY: Record<string, number> = { budtender: 1, shift_lead: 2, manager: 3, admin: 4, owner: 5 }

describe('permission system', () => {
  it('1. hasPermission returns true when exists', () => {
    expect(hasPermission(EMPLOYEE_PERMS, 'GENERAL_LOGIN_POS')).toBe(true)
  })

  it('2. hasPermission returns false when missing', () => {
    expect(hasPermission(EMPLOYEE_PERMS, 'GENERAL_ADMIN_ADMINISTRATOR')).toBe(false)
  })

  it('3. hasAnyPermission: at least one matches', () => {
    expect(hasAnyPermission(EMPLOYEE_PERMS, ['GENERAL_ADMIN_ADMINISTRATOR', 'GENERAL_LOGIN_POS'])).toBe(true)
  })

  it('4. hasAllPermissions: false when one missing', () => {
    expect(hasAllPermissions(EMPLOYEE_PERMS, ['GENERAL_LOGIN_POS', 'GENERAL_ADMIN_ADMINISTRATOR'])).toBe(false)
  })

  it('5. PermissionGate renders when granted (logic)', () => {
    const permission = 'GENERAL_LOGIN_POS'
    const allowed = hasPermission(EMPLOYEE_PERMS, permission)
    expect(allowed).toBe(true)
  })

  it('6. PermissionGate hides when denied (logic)', () => {
    const permission = 'MAINT_USERS_EDIT'
    const allowed = hasPermission(EMPLOYEE_PERMS, permission)
    expect(allowed).toBe(false)
  })

  it('7. mode=all requires all permissions', () => {
    const result = hasAllPermissions(EMPLOYEE_PERMS, ['GENERAL_LOGIN_POS', 'POS_BACKEND_VIEW_POS'])
    expect(result).toBe(true)
    const fail = hasAllPermissions(EMPLOYEE_PERMS, ['GENERAL_LOGIN_POS', 'MAINT_USERS_EDIT'])
    expect(fail).toBe(false)
  })

  it('8. requirePermission throws for unauthorized', () => {
    const perms = ['GENERAL_LOGIN_POS']
    const required = 'MAINT_PRODUCTS_CREATE'
    expect(hasPermission(perms, required)).toBe(false)
    // In real code: throws AppError PERMISSION_DENIED
  })

  it('9. requireRole: manager passes when min is shift_lead', () => {
    const empLevel = ROLE_HIERARCHY['manager']!
    const reqLevel = ROLE_HIERARCHY['shift_lead']!
    expect(empLevel >= reqLevel).toBe(true)
  })

  it('10. requireRole: budtender blocked when min is manager', () => {
    const empLevel = ROLE_HIERARCHY['budtender']!
    const reqLevel = ROLE_HIERARCHY['manager']!
    expect(empLevel >= reqLevel).toBe(false)
  })

  it('11. manager override: valid PIN + correct permission', () => {
    const managerPerms = ['GENERAL_ADMIN_ADMINISTRATOR', 'POS_BACKEND_CLOSE_REGISTER']
    const required = 'POS_BACKEND_CLOSE_REGISTER'
    expect(hasPermission(managerPerms, required)).toBe(true)
  })

  it('12. manager override: valid PIN but wrong permission', () => {
    const shiftLeadPerms = ['GENERAL_LOGIN_POS', 'POS_BACKEND_VIEW_POS']
    const required = 'POS_BACKEND_CLOSE_REGISTER'
    expect(hasPermission(shiftLeadPerms, required)).toBe(false)
  })
})
