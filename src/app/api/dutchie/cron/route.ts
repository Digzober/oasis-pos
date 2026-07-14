import { NextRequest, NextResponse } from 'next/server'
import { enforceCronSecret } from '@/lib/auth/cron'

/**
 * Phase A installs and verifies the authorization boundary only.
 * Scheduled Dutchie sync orchestration is implemented in Phase B.
 */
async function handleCron(request: NextRequest) {
  const authError = enforceCronSecret(request)
  if (authError) return authError

  return NextResponse.json(
    { error: 'Dutchie scheduled sync is not available until Phase B' },
    { status: 501 },
  )
}

export const GET = handleCron
export const POST = handleCron
