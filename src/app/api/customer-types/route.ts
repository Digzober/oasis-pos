import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

const CUSTOMER_TYPES = [
  { value: 'recreational', label: 'Recreational' },
  { value: 'medical', label: 'Medical' },
  { value: 'medical_out_of_state', label: 'Medical (Out of State)' },
  { value: 'medical_tax_exempt', label: 'Medical (Tax Exempt)' },
  { value: 'non_cannabis', label: 'Non-Cannabis' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'processor', label: 'Processor' },
  { value: 'retailer', label: 'Retailer' },
] as const

export async function GET() {
  try {
    await requireSession()
    return NextResponse.json({ types: CUSTOMER_TYPES })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer types error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
