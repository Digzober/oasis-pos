import type { DutchieCustomer } from './client'

/**
 * Maps a Dutchie customer record to our customers table schema.
 * Customer group memberships must be resolved separately after customer insert.
 *
 * CHECK constraints enforced:
 * - customer_type: 'recreational' | 'medical' | 'medical_out_of_state' | 'medical_tax_exempt' |
 *                  'non_cannabis' | 'distributor' | 'processor' | 'retailer'
 * - status: 'active' | 'banned' | 'inactive'
 */

type CustomerType = 'recreational' | 'medical' | 'medical_out_of_state' | 'medical_tax_exempt'
  | 'non_cannabis' | 'distributor' | 'processor' | 'retailer'

type CustomerStatus = 'active' | 'inactive' | 'banned'

export interface MappedCustomer {
  first_name: string
  last_name: string
  middle_name: string | null
  prefix: string | null
  suffix: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  mobile_phone: string | null
  email: string | null
  status: CustomerStatus
  medical_card_number: string | null
  medical_card_expiration: string | null
  customer_type: CustomerType
  gender: string | null
  date_of_birth: string | null
  notes: string | null
  custom_identifier: string | null
  opted_into_loyalty: boolean
  is_anonymous: boolean
  last_visit_at: string | null
  referral_source: string | null
  other_referral_source: string | null
  external_code: string | null
  dutchie_customer_id: number
  springbig_member_id: string | null
}

/**
 * Maps Dutchie status strings to our CHECK constraint values.
 */
function mapCustomerStatus(dutchieStatus: string | null): CustomerStatus {
  if (!dutchieStatus) return 'active'
  const lower = dutchieStatus.toLowerCase()
  if (lower === 'banned') return 'banned'
  if (lower === 'archived' || lower === 'inactive') return 'inactive'
  return 'active'
}

/**
 * Maps Dutchie customer type strings to our CHECK constraint values.
 * NOTE: 'both' / 'dual' are NOT valid — Dutchie uses these for customers
 * who can buy rec and med, but since they have a medical card, we map to 'medical'.
 */
function mapCustomerType(dutchieType: string | null): CustomerType {
  if (!dutchieType) return 'recreational'
  const lower = dutchieType.toLowerCase()
  if (lower === 'medical') return 'medical'
  if (lower === 'both' || lower === 'dual') return 'medical'
  if (lower === 'medical_out_of_state' || lower === 'out of state') return 'medical_out_of_state'
  if (lower === 'medical_tax_exempt' || lower === 'tax exempt') return 'medical_tax_exempt'
  if (lower === 'non_cannabis' || lower === 'non-cannabis') return 'non_cannabis'
  if (lower === 'distributor') return 'distributor'
  if (lower === 'processor') return 'processor'
  if (lower === 'retailer') return 'retailer'
  return 'recreational'
}

export function mapDutchieCustomer(dc: DutchieCustomer): MappedCustomer {
  return {
    first_name: dc.firstName || 'Unknown',
    last_name: dc.lastName || 'Customer',
    middle_name: dc.middleName || null,
    prefix: dc.namePrefix || null,
    suffix: dc.nameSuffix || null,
    address_line1: dc.address1 || null,
    address_line2: dc.address2 || null,
    city: dc.city || null,
    state: dc.state || null,
    zip: dc.postalCode || null,
    phone: dc.phone || null,
    mobile_phone: dc.cellPhone || null,
    email: dc.emailAddress || null,
    status: mapCustomerStatus(dc.status),
    medical_card_number: dc.mmjidNumber || null,
    medical_card_expiration: dc.mmjidExpirationDate || null,
    customer_type: mapCustomerType(dc.customerType),
    gender: dc.gender || null,
    date_of_birth: dc.dateOfBirth || null,
    notes: dc.notes || null,
    custom_identifier: dc.customIdentifier || null,
    opted_into_loyalty: dc.isLoyaltyMember ?? false,
    is_anonymous: dc.isAnonymous ?? false,
    last_visit_at: dc.lastTransactionDate || null,
    referral_source: dc.referralSource || null,
    other_referral_source: dc.otherReferralSource || null,
    external_code: dc.externalCustomerId || null,
    dutchie_customer_id: dc.customerId,
    springbig_member_id: dc.springBigMemberId ? String(dc.springBigMemberId) : null,
  }
}

/**
 * Extracts discount group names from a batch of Dutchie customers.
 * These map to our customer_groups table.
 */
export function extractCustomerGroups(customers: DutchieCustomer[]): Set<string> {
  const groups = new Set<string>()
  for (const c of customers) {
    if (c.discountGroups) {
      for (const g of c.discountGroups) {
        if (g.trim()) groups.add(g.trim())
      }
    }
  }
  return groups
}
