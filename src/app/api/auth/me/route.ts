import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Load permissions from DB if not in JWT
  if (session.permissions.length === 0) {
    const sb = await createSupabaseServerClient()
    const { data: permRows } = await sb
      .from('user_permission_groups')
      .select(`
        permission_groups!inner (
          permission_group_permissions (
            permission_definitions!inner ( code )
          )
        )
      `)
      .eq('employee_id', session.employeeId)

    const permissions: string[] = []
    if (permRows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of permRows as any[]) {
        const group = row.permission_groups
        if (group?.permission_group_permissions) {
          for (const pgp of group.permission_group_permissions) {
            if (pgp.permission_definitions?.code) {
              permissions.push(pgp.permission_definitions.code)
            }
          }
        }
      }
    }

    return NextResponse.json({
      session: { ...session, permissions: [...new Set(permissions)] },
    })
  }

  return NextResponse.json({ session })
}
