import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listWorkflows, createWorkflow } from '@/lib/services/workflowService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ workflows: await listWorkflows(s.organizationId) }) }
  catch (err) { logger.error('Workflows error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ workflow: await createWorkflow({ ...(await req.json()), organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Workflow create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
