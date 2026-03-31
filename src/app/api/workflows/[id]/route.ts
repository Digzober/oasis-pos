import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateWorkflow, activateWorkflow, pauseWorkflow } from '@/lib/services/workflowService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const body = await req.json()
    if (body.action === 'activate') { await activateWorkflow(id); return NextResponse.json({ success: true }) }
    if (body.action === 'pause') { await pauseWorkflow(id); return NextResponse.json({ success: true }) }
    return NextResponse.json({ workflow: await updateWorkflow(id, body) })
  } catch (err) { logger.error('Workflow update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
