import { NextResponse } from 'next/server'

/**
 * Fail-closed authorization for machine-triggered routes.
 * A missing deployment secret is a server configuration error, never an auth bypass.
 */
export function enforceCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron authorization is not configured' }, { status: 500 })
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
