import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getEmployeePermissions, hasPermission } from '@/lib/services/permissionService'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { pin, permission } = await request.json()
    if (!pin || !permission) return NextResponse.json({ error: 'PIN and permission required' }, { status: 400 })

    const pinHash = crypto.createHash('sha256').update(pin).digest('hex')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: employee } = await sb.from('employees').select('id, first_name, last_name, role').eq('pin_hash', pinHash).eq('is_active', true).maybeSingle()

    if (!employee) return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

    // Check if this employee has the required permission
    const perms = await getEmployeePermissions(employee.id)
    if (!hasPermission(perms, permission)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    logger.info('Manager override approved', { employeeId: employee.id, permission })
    return NextResponse.json({ employee_id: employee.id, employee_name: `${employee.first_name} ${employee.last_name}` })
  } catch (err) {
    logger.error('Manager verify error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
