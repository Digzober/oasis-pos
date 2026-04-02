import crypto from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerSearchResult {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  is_medical: boolean
  status: string
  last_visit_at: string | null
  lifetime_spend: number
  loyalty_points: number
}

export interface CustomerProfile {
  id: string
  first_name: string | null
  last_name: string | null
  middle_name: string | null
  prefix: string | null
  suffix: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  id_type: string | null
  id_number_hash: string | null
  id_state: string | null
  id_expiration: string | null
  medical_card_number: string | null
  medical_card_expiration: string | null
  medical_provider: string | null
  is_medical: boolean
  status: string
  lifetime_spend: number
  visit_count: number
  last_visit_at: string | null
  opted_into_marketing: boolean
  notes: string | null
  organization_id: string
  created_at: string
  groups: Array<{ id: string; name: string }>
  loyalty_points: number
  loyalty_tier: string | null
  is_first_visit: boolean
  has_id_on_file: boolean
  medical_card_expired: boolean
  recent_transactions: Array<{
    id: string
    created_at: string
    total: number
    status: string
    item_count: number
  }>
}

export interface CreateCustomerInput {
  organization_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  phone?: string | null
  email?: string | null
  id_type?: string | null
  id_number?: string | null
  id_state?: string | null
  id_expiration?: string | null
  medical_card_number?: string | null
  medical_card_expiration?: string | null
  medical_provider?: string | null
  middle_name?: string | null
  prefix?: string | null
  suffix?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  notes?: string | null
  external_code?: string | null
  opted_into_marketing?: boolean
  customer_type?: string
  gender?: string | null
  pronoun?: string | null
  mobile_phone?: string | null
  drivers_license?: string | null
  drivers_license_expiration?: string | null
  id_start_date?: string | null
  opted_into_sms?: boolean
  opted_into_loyalty?: boolean
  caregiver_info?: Record<string, unknown> | null
}

export interface UpdateCustomerInput {
  first_name?: string
  last_name?: string
  phone?: string | null
  email?: string | null
  date_of_birth?: string
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  id_type?: string | null
  id_number?: string | null
  id_state?: string | null
  id_expiration?: string | null
  medical_card_number?: string | null
  medical_card_expiration?: string | null
  medical_provider?: string | null
  is_medical?: boolean
  status?: string
  notes?: string | null
  opted_into_marketing?: boolean
  middle_name?: string | null
  prefix?: string | null
  suffix?: string | null
  external_code?: string | null
  ban_reason?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashIdNumber(idNumber: string): string {
  return crypto.createHash('sha256').update(idNumber).digest('hex')
}

function isOver21(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= 21
  }
  return age >= 21
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ') || 'Unknown'
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchCustomers(
  organizationId: string,
  query: string,
  limit = 10,
): Promise<CustomerSearchResult[]> {
  if (!query || query.trim().length === 0) return []

  const sb = await createSupabaseServerClient()
  const q = query.trim()

  // Determine search strategy
  const digitsOnly = q.replace(/\D/g, '')
  const isPhone = digitsOnly.length >= 7
  const isEmail = q.includes('@')
  const isMedCard = q.toUpperCase().startsWith('MC-') || (/^\d{6,}$/.test(q) && !isPhone)

  let customerQuery = sb
    .from('customers')
    .select('id, first_name, last_name, phone, email, is_medical, status, last_visit_at, lifetime_spend')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .limit(limit)

  if (isPhone) {
    customerQuery = customerQuery.ilike('phone', `%${digitsOnly}%`)
  } else if (isEmail) {
    customerQuery = customerQuery.ilike('email', `%${q}%`)
  } else if (isMedCard) {
    const cardNum = q.toUpperCase().startsWith('MC-') ? q.substring(3) : q
    customerQuery = customerQuery.ilike('medical_card_number', `%${cardNum}%`)
  } else {
    customerQuery = customerQuery.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`)
  }

  const { data: customers, error } = await customerQuery.order('last_name')

  if (error) {
    logger.error('Customer search failed', { error: error.message, query: q })
    throw new AppError('CUSTOMER_SEARCH_FAILED', 'Failed to search customers', error, 500)
  }

  if (!customers || customers.length === 0) return []

  // Fetch loyalty points for found customers
  const customerIds = customers.map((c) => c.id)
  const { data: balances } = await sb
    .from('loyalty_balances')
    .select('customer_id, current_points')
    .in('customer_id', customerIds)

  const pointsMap = new Map<string, number>()
  for (const b of balances ?? []) {
    pointsMap.set(b.customer_id, b.current_points)
  }

  return customers.map((c) => ({
    id: c.id,
    full_name: fullName(c.first_name, c.last_name),
    phone: c.phone,
    email: c.email,
    is_medical: c.is_medical,
    status: c.status,
    last_visit_at: c.last_visit_at,
    lifetime_spend: c.lifetime_spend,
    loyalty_points: pointsMap.get(c.id) ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const sb = await createSupabaseServerClient()

  const { data: customer, error } = await sb
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (error || !customer) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', error, 404)
  }

  // Parallel fetches
  const [groupsResult, loyaltyResult, transactionsResult] = await Promise.all([
    sb
      .from('customer_group_members')
      .select('customer_groups ( id, name )')
      .eq('customer_id', customerId),
    sb
      .from('loyalty_balances')
      .select('current_points, tier_id, loyalty_tiers ( name )')
      .eq('customer_id', customerId)
      .maybeSingle(),
    sb
      .from('transactions')
      .select('id, created_at, total, status, transaction_lines ( id )')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups = (groupsResult.data ?? []).map((g: any) => g.customer_groups).filter(Boolean)
  const loyalty = loyaltyResult.data
  const transactions = transactionsResult.data ?? []

  const now = new Date()
  const medExpired = customer.medical_card_expiration
    ? new Date(customer.medical_card_expiration) < now
    : false

  return {
    id: customer.id,
    first_name: customer.first_name,
    last_name: customer.last_name,
    middle_name: customer.middle_name,
    prefix: customer.prefix,
    suffix: customer.suffix,
    email: customer.email,
    phone: customer.phone,
    date_of_birth: customer.date_of_birth,
    address_line1: customer.address_line1,
    address_line2: customer.address_line2,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    id_type: customer.id_type,
    id_number_hash: customer.id_number_hash,
    id_state: customer.id_state,
    id_expiration: customer.id_expiration,
    medical_card_number: customer.medical_card_number,
    medical_card_expiration: customer.medical_card_expiration,
    medical_provider: customer.medical_provider,
    is_medical: customer.is_medical,
    status: customer.status,
    lifetime_spend: customer.lifetime_spend,
    visit_count: customer.visit_count,
    last_visit_at: customer.last_visit_at,
    opted_into_marketing: customer.opted_into_marketing,
    notes: customer.notes,
    organization_id: customer.organization_id,
    created_at: customer.created_at,
    groups,
    loyalty_points: loyalty?.current_points ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loyalty_tier: (loyalty?.loyalty_tiers as any)?.name ?? null,
    is_first_visit: customer.visit_count === 0,
    has_id_on_file: !!customer.id_type && !!customer.id_number_hash,
    medical_card_expired: medExpired,
    recent_transactions: transactions.map((t) => ({
      id: t.id,
      created_at: t.created_at,
      total: t.total,
      status: t.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      item_count: Array.isArray(t.transaction_lines) ? (t.transaction_lines as any[]).length : 0,
    })),
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createCustomer(input: CreateCustomerInput) {
  // Age check
  if (!isOver21(input.date_of_birth)) {
    throw new AppError('UNDERAGE', 'Customer must be 21 or older', undefined, 400)
  }

  const sb = await createSupabaseServerClient()

  // Check duplicate phone
  if (input.phone) {
    const { data: dup } = await sb
      .from('customers')
      .select('id')
      .eq('organization_id', input.organization_id)
      .eq('phone', input.phone)
      .eq('status', 'active')
      .maybeSingle()

    if (dup) {
      throw new AppError('DUPLICATE_PHONE', 'A customer with this phone number already exists', undefined, 409)
    }
  }

  const isMedical = !!input.medical_card_number

  const { data: customer, error } = await sb
    .from('customers')
    .insert({
      organization_id: input.organization_id,
      first_name: input.first_name,
      last_name: input.last_name,
      date_of_birth: input.date_of_birth,
      phone: input.phone ?? null,
      email: input.email ?? null,
      id_type: input.id_type ?? null,
      id_number_hash: input.id_number ? hashIdNumber(input.id_number) : null,
      id_state: input.id_state ?? null,
      id_expiration: input.id_expiration ?? null,
      medical_card_number: input.medical_card_number ?? null,
      medical_card_expiration: input.medical_card_expiration ?? null,
      medical_provider: input.medical_provider ?? null,
      is_medical: isMedical,
      status: 'active',
      middle_name: input.middle_name ?? null,
      prefix: input.prefix ?? null,
      suffix: input.suffix ?? null,
      address_line1: input.address_line1 ?? null,
      address_line2: input.address_line2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
      notes: input.notes ?? null,
      external_code: input.external_code ?? null,
      opted_into_marketing: input.opted_into_marketing ?? false,
      customer_type: input.customer_type ?? (isMedical ? 'medical' : 'recreational'),
      gender: input.gender ?? null,
      pronoun: input.pronoun ?? null,
      mobile_phone: input.mobile_phone ?? null,
      drivers_license: input.drivers_license ?? null,
      drivers_license_expiration: input.drivers_license_expiration ?? null,
      id_start_date: input.id_start_date ?? null,
      opted_into_sms: input.opted_into_sms ?? false,
      opted_into_loyalty: input.opted_into_loyalty ?? false,
      caregiver_info: input.caregiver_info ?? null,
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create customer', { error: error.message })
    throw new AppError('CUSTOMER_CREATE_FAILED', 'Failed to create customer', error, 500)
  }

  // Create loyalty balance
  await sb.from('loyalty_balances').insert({
    customer_id: customer.id,
    organization_id: input.organization_id,
    current_points: 0,
    lifetime_points: 0,
  })

  return customer
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateCustomer(customerId: string, input: UpdateCustomerInput) {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { ...input }

  // Hash ID number if provided
  if (input.id_number !== undefined) {
    updateData.id_number_hash = input.id_number ? hashIdNumber(input.id_number) : null
    delete updateData.id_number
  }

  // Auto-set is_medical if medical card provided
  if (input.medical_card_number !== undefined) {
    updateData.is_medical = !!input.medical_card_number
  }

  const { data: customer, error } = await sb
    .from('customers')
    .update(updateData)
    .eq('id', customerId)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update customer', { error: error.message, customerId })
    throw new AppError('CUSTOMER_UPDATE_FAILED', 'Failed to update customer', error, 500)
  }

  return customer
}
