import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

let btCacheResult = true
let btCacheTime = 0

async function checkDatabase(): Promise<boolean> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await sb.from('organizations').select('id').limit(1)
    return !error
  } catch { return false }
}

async function checkBioTrack(): Promise<boolean> {
  // Cache for 60 seconds
  if (Date.now() - btCacheTime < 60000) return btCacheResult
  try {
    const url = process.env.BIOTRACK_V3_URL
    if (!url) { btCacheResult = true; btCacheTime = Date.now(); return true }
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    btCacheResult = res.ok || res.status < 500
  } catch {
    btCacheResult = false
  }
  btCacheTime = Date.now()
  return btCacheResult
}

export async function GET() {
  const [database, biotrack] = await Promise.all([checkDatabase(), checkBioTrack()])

  const checks = {
    status: database ? 'healthy' : 'unhealthy',
    database,
    biotrack,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'unknown',
  }

  return NextResponse.json(checks, { status: database ? 200 : 503 })
}
