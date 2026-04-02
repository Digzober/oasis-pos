import type { DutchieCustomer } from '../types'

type CustomerType =
  | 'recreational'
  | 'medical'
  | 'medical_out_of_state'
  | 'medical_tax_exempt'
  | 'non_cannabis'
  | 'distributor'
  | 'processor'
  | 'retailer'

type CustomerStatus = 'active' | 'banned' | 'inactive'

const CUSTOMER_TYPE_MAP: Record<string, CustomerType> = {
  recreational: 'recreational',
  rec: 'recreational',
  adult: 'recreational',
  'adult use': 'recreational',
  medical: 'medical',
  med: 'medical',
  both: 'medical',
  dual: 'medical',
  medical_out_of_state: 'medical_out_of_state',
  'out of state': 'medical_out_of_state',
  medical_tax_exempt: 'medical_tax_exempt',
  'tax exempt': 'medical_tax_exempt',
  non_cannabis: 'non_cannabis',
  distributor: 'distributor',
  processor: 'processor',
  retailer: 'retailer',
}

const STATUS_MAP: Record<string, CustomerStatus> = {
  active: 'active',
  banned: 'banned',
  blocked: 'banned',
  inactive: 'inactive',
  disabled: 'inactive',
  deleted: 'inactive',
}

export interface MappedCustomer {
  organization_id: string
  first_name: string | null
  last_name: string | null
  middle_name: string | null
  name_prefix: string | null
  name_suffix: string | null
  email: string | null
  phone: string | null
  cell_phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  customer_type: CustomerType
  status: CustomerStatus
  date_of_birth: string | null
  gender: string | null
  medical_card_number: string | null
  medical_card_expiry: string | null
  notes: string | null
  is_loyalty_member: boolean
  is_anonymous: boolean
  referral_source: string | null
  drivers_license_hash: string | null
  last_transaction_at: string | null
  dutchie_customer_id: number
}

export function mapCustomer(
  source: DutchieCustomer,
  organizationId: string,
): MappedCustomer {
  const normalizedType = source.customerType?.toLowerCase().trim() ?? ''
  const customerType: CustomerType = CUSTOMER_TYPE_MAP[normalizedType] ?? 'recreational'

  const normalizedStatus = source.status?.toLowerCase().trim() ?? ''
  const status: CustomerStatus = STATUS_MAP[normalizedStatus] ?? 'active'

  return {
    organization_id: organizationId,
    first_name: source.firstName ?? null,
    last_name: source.lastName ?? null,
    middle_name: source.middleName ?? null,
    name_prefix: source.namePrefix ?? null,
    name_suffix: source.nameSuffix ?? null,
    email: source.emailAddress ?? null,
    phone: source.phone ?? null,
    cell_phone: source.cellPhone ?? null,
    address_line1: source.address1 ?? null,
    address_line2: source.address2 ?? null,
    city: source.city ?? null,
    state: source.state ?? null,
    postal_code: source.postalCode ?? null,
    customer_type: customerType,
    status,
    date_of_birth: source.dateOfBirth ?? null,
    gender: source.gender ?? null,
    medical_card_number: source.mmjidNumber ?? null,
    medical_card_expiry: source.mmjidExpirationDate ?? null,
    notes: source.notes ?? null,
    is_loyalty_member: source.isLoyaltyMember,
    is_anonymous: source.isAnonymous,
    referral_source: source.referralSource ?? null,
    drivers_license_hash: source.driversLicenseHash ?? null,
    last_transaction_at: source.lastTransactionDate ?? null,
    dutchie_customer_id: source.customerId,
  }
}
