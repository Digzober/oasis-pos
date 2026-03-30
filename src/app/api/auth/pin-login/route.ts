import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod/v4'
import { createClient } from '@supabase/supabase-js'
import { createSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  locationId: z.uuid('Invalid location ID'),
})

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = pinLoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { pin, locationId } = parsed.data
    const pinHash = hashPin(pin)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Find active employee with matching PIN hash
    const { data: employee, error: empError } = await sb
      .from('employees')
      .select('id, first_name, last_name, role, email, organization_id')
      .eq('pin_hash', pinHash)
      .eq('is_active', true)
      .maybeSingle()

    if (empError) {
      logger.error('Employee lookup failed', { error: empError.message })
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    if (!employee) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Verify employee is assigned to requested location
    const { data: assignment, error: locError } = await sb
      .from('employee_locations')
      .select('location_id')
      .eq('employee_id', employee.id)
      .eq('location_id', locationId)
      .maybeSingle()

    if (locError) {
      logger.error('Location assignment lookup failed', { error: locError.message })
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'Not assigned to this location' },
        { status: 403 },
      )
    }

    // Get location details
    const { data: location } = await sb
      .from('locations')
      .select('id, name')
      .eq('id', locationId)
      .single()

    // Get permission codes via the full chain
    const { data: permRows } = await sb
      .from('user_permission_groups')
      .select(`
        permission_group_id,
        permission_groups!inner (
          permission_group_permissions (
            permission_definitions!inner ( code )
          )
        )
      `)
      .eq('employee_id', employee.id)

    const permissions: string[] = []
    if (permRows) {
      for (const row of permRows) {
        const group = row.permission_groups as unknown as {
          permission_group_permissions: Array<{
            permission_definitions: { code: string }
          }>
        }
        if (group?.permission_group_permissions) {
          for (const pgp of group.permission_group_permissions) {
            if (pgp.permission_definitions?.code) {
              permissions.push(pgp.permission_definitions.code)
            }
          }
        }
      }
    }

    const uniquePermissions = [...new Set(permissions)]

    // Create session cookie (keep JWT small — permissions fetched via /api/auth/me)
    await createSession({
      employeeId: employee.id,
      organizationId: employee.organization_id,
      locationId,
      locationName: location?.name ?? '',
      employeeName: `${employee.first_name} ${employee.last_name}`,
      role: employee.role as 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner',
      permissions: [],
    })

    logger.info('Employee logged in', {
      employeeId: employee.id,
      locationId,
      role: employee.role,
    })

    return NextResponse.json({
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role,
        email: employee.email,
      },
      location: { id: locationId, name: location?.name },
      permissions: uniquePermissions,
    })
  } catch (err) {
    logger.error('PIN login error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
