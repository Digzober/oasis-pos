import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface CustomerRow {
  id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  phone: string | null
  email: string | null
  created_at: string
  visit_count: number
  lifetime_spend: number
}

interface DuplicateGroup {
  confidence: 'high' | 'medium'
  match_type: 'name_dob' | 'phone' | 'email'
  customers: CustomerRow[]
}

export async function POST() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: customers, error } = await sb
      .from('customers')
      .select('id, first_name, last_name, date_of_birth, phone, email, created_at, visit_count, lifetime_spend')
      .eq('organization_id', session.organizationId)
      .eq('status', 'active')
      .order('last_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!customers || customers.length === 0) return NextResponse.json({ groups: [] })

    const groups: DuplicateGroup[] = []
    const seenIds = new Set<string>()

    // Strategy 1: Exact first_name + last_name + date_of_birth (high confidence)
    const nameDobMap = new Map<string, CustomerRow[]>()
    for (const c of customers) {
      if (!c.first_name || !c.last_name || !c.date_of_birth) continue
      const key = `${c.first_name.toLowerCase()}|${c.last_name.toLowerCase()}|${c.date_of_birth}`
      const existing = nameDobMap.get(key)
      if (existing) {
        existing.push(c)
      } else {
        nameDobMap.set(key, [c])
      }
    }
    for (const dupes of nameDobMap.values()) {
      if (dupes.length < 2) continue
      groups.push({ confidence: 'high', match_type: 'name_dob', customers: dupes })
      for (const d of dupes) seenIds.add(d.id)
    }

    // Strategy 2: Same phone, different records (medium confidence)
    const phoneMap = new Map<string, CustomerRow[]>()
    for (const c of customers) {
      if (!c.phone || seenIds.has(c.id)) continue
      const normalized = c.phone.replace(/\D/g, '')
      if (normalized.length < 7) continue
      const existing = phoneMap.get(normalized)
      if (existing) {
        existing.push(c)
      } else {
        phoneMap.set(normalized, [c])
      }
    }
    for (const dupes of phoneMap.values()) {
      if (dupes.length < 2) continue
      groups.push({ confidence: 'medium', match_type: 'phone', customers: dupes })
      for (const d of dupes) seenIds.add(d.id)
    }

    // Strategy 3: Same email, different records (medium confidence)
    const emailMap = new Map<string, CustomerRow[]>()
    for (const c of customers) {
      if (!c.email || seenIds.has(c.id)) continue
      const normalized = c.email.toLowerCase().trim()
      const existing = emailMap.get(normalized)
      if (existing) {
        existing.push(c)
      } else {
        emailMap.set(normalized, [c])
      }
    }
    for (const dupes of emailMap.values()) {
      if (dupes.length < 2) continue
      groups.push({ confidence: 'medium', match_type: 'email', customers: dupes })
    }

    // Cap results at 50 groups to avoid oversized responses
    const capped = groups.slice(0, 50)

    return NextResponse.json({ groups: capped })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Duplicate scan error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
