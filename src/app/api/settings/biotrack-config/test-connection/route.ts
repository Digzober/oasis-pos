import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface TestResult {
  v3: { status: 'success' | 'failed' | 'skipped'; message: string; latencyMs?: number }
  v1: { status: 'success' | 'failed' | 'skipped'; message: string; latencyMs?: number }
  overall: 'connected' | 'partial' | 'disconnected'
}

export async function POST() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    // Load config from DB
    const { data: row, error } = await (sb.from('biotrack_config') as any)
      .select('*')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({
        error: 'No BioTrack configuration found for this location. Save your settings first.',
      }, { status: 404 })
    }

    if (!row.is_enabled) {
      return NextResponse.json({
        error: 'BioTrack integration is disabled for this location.',
      }, { status: 400 })
    }

    const result: TestResult = {
      v3: { status: 'skipped', message: 'No REST API URL configured' },
      v1: { status: 'skipped', message: 'No XML API URL configured' },
      overall: 'disconnected',
    }

    // Test v3 REST API — attempt actual authentication
    if (row.rest_api_url && row.username_encrypted && row.password_encrypted) {
      const v3Start = Date.now()
      try {
        // BioTrack Trace 2.0 v3 REST API uses /v1/login with PascalCase fields
        const res = await fetch(`${row.rest_api_url}/v1/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Username: row.username_encrypted,
            Password: row.password_encrypted,
            UBI: row.ubi ?? '',
          }),
          signal: AbortSignal.timeout(15000),
        })

        const body = await res.json().catch(() => ({}))
        const latencyMs = Date.now() - v3Start

        if (res.ok && !body.Error && (body.Session || body.sessionid || body.success)) {
          result.v3 = {
            status: 'success',
            message: `Authenticated successfully (${latencyMs}ms)`,
            latencyMs,
          }
        } else {
          const errMsg = body.Error ?? body.error ?? body.message ?? res.statusText ?? 'Unknown error'
          result.v3 = {
            status: 'failed',
            message: `Auth failed: ${errMsg}`,
            latencyMs,
          }
        }
      } catch (err) {
        const latencyMs = Date.now() - v3Start
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('timeout') || msg.includes('abort')) {
          result.v3 = { status: 'failed', message: 'Connection timed out (15s)', latencyMs }
        } else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
          result.v3 = { status: 'failed', message: `Cannot resolve host: ${row.rest_api_url}`, latencyMs }
        } else if (msg.includes('ECONNREFUSED')) {
          result.v3 = { status: 'failed', message: `Connection refused by ${row.rest_api_url}`, latencyMs }
        } else {
          result.v3 = { status: 'failed', message: `Connection error: ${msg}`, latencyMs }
        }
      }
    } else {
      const missing = []
      if (!row.rest_api_url) missing.push('REST API URL')
      if (!row.username_encrypted) missing.push('Username')
      if (!row.password_encrypted) missing.push('Password')
      result.v3 = { status: 'failed', message: `Missing: ${missing.join(', ')}` }
    }

    // Test v1 XML API — lightweight connectivity check (just hit the endpoint)
    if (row.xml_api_url) {
      const v1Start = Date.now()
      try {
        const res = await fetch(row.xml_api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <connect_test>
      <username>${escapeXml(row.username_encrypted ?? '')}</username>
      <password>${escapeXml(row.password_encrypted ?? '')}</password>
      <UBI>${escapeXml(row.ubi ?? '')}</UBI>
    </connect_test>
  </soap:Body>
</soap:Envelope>`,
          signal: AbortSignal.timeout(15000),
        })

        const latencyMs = Date.now() - v1Start
        // v1 returning any response (even an error) means the server is reachable
        // A 200 or XML response confirms the endpoint is alive
        if (res.ok || res.status < 500) {
          result.v1 = {
            status: 'success',
            message: `Server reachable (${latencyMs}ms, HTTP ${res.status})`,
            latencyMs,
          }
        } else {
          result.v1 = {
            status: 'failed',
            message: `Server error: HTTP ${res.status}`,
            latencyMs,
          }
        }
      } catch (err) {
        const latencyMs = Date.now() - v1Start
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('timeout') || msg.includes('abort')) {
          result.v1 = { status: 'failed', message: 'Connection timed out (15s)', latencyMs }
        } else {
          result.v1 = { status: 'failed', message: `Connection error: ${msg}`, latencyMs }
        }
      }
    }

    // Determine overall status
    if (result.v3.status === 'success' && (result.v1.status === 'success' || result.v1.status === 'skipped')) {
      result.overall = 'connected'
    } else if (result.v3.status === 'success' || result.v1.status === 'success') {
      result.overall = 'partial'
    } else {
      result.overall = 'disconnected'
    }

    logger.info('BioTrack connection test', {
      locationId: session.locationId,
      overall: result.overall,
      v3Status: result.v3.status,
      v1Status: result.v1.status,
    })

    return NextResponse.json({ result })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('BioTrack connection test error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
