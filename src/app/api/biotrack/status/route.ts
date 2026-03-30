import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { count } = await sb
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', session.locationId)
      .eq('biotrack_synced', false)
      .neq('status', 'voided')

    return NextResponse.json({ unsynced_count: count ?? 0 })
  } catch {
    return NextResponse.json({ unsynced_count: 0 })
  }
}
