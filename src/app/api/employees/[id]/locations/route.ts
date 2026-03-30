import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { assignLocations } from '@/lib/services/employeeManagementService'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); const { id } = await params
    const body = z.object({ location_ids: z.array(z.uuid()).min(1), primary_location_id: z.uuid() }).parse(await req.json())
    await assignLocations(id, body.location_ids, body.primary_location_id)
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
