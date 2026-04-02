import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

const GeneratePackageIdSchema = z.object({
  location_id: z.uuid(),
})

export async function POST(request: NextRequest) {
  try {
    await requireSession()

    const body = await request.json()
    const parsed = GeneratePackageIdSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const timestamp = Date.now()
    const random = Math.floor(1000 + Math.random() * 9000)
    const packageId = `BT-${timestamp}-${random}`

    return NextResponse.json({ package_id: packageId })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Generate package ID error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
