import { NextRequest, NextResponse } from 'next/server'
import { enforceCronSecret } from '@/lib/auth/cron'
import { runDutchieCron } from '@/lib/dutchie/cronRunner'
import { logger } from '@/lib/utils/logger'

async function handleCron(request: NextRequest) {
  const authError = enforceCronSecret(request)
  if (authError) return authError

  try {
    const result = await runDutchieCron({ deadline: Date.now() + 250_000 })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Dutchie cron failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Dutchie scheduled sync failed' }, { status: 500 })
  }
}

export const GET = handleCron
export const POST = handleCron
