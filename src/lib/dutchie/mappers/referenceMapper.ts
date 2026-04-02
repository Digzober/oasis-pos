import type {
  DutchieBrand,
  DutchieStrain,
  DutchieVendor,
  DutchieCategory,
  DutchieTag,
  DutchiePricingTier,
  DutchieTerminal,
} from '../types'

type StrainType = 'indica' | 'sativa' | 'hybrid' | 'cbd'
type AvailableFor = 'all' | 'medical' | 'recreational'
type TagType = 'product' | 'inventory'

const STRAIN_TYPE_MAP: Record<string, StrainType> = {
  indica: 'indica',
  sativa: 'sativa',
  hybrid: 'hybrid',
  cbd: 'cbd',
  'indica dominant': 'indica',
  'sativa dominant': 'sativa',
  'indica-dominant': 'indica',
  'sativa-dominant': 'sativa',
  'high cbd': 'cbd',
}

function generateSlug(name: string, dutchieId: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base}-d${dutchieId}`
}

// --- Brand ---

export interface MappedBrand {
  organization_id: string
  name: string
  external_id: string
}

export function mapBrand(
  source: DutchieBrand,
  organizationId: string,
): MappedBrand {
  return {
    organization_id: organizationId,
    name: source.brandName,
    external_id: String(source.brandId),
  }
}

// --- Strain ---

export interface MappedStrain {
  organization_id: string
  name: string
  strain_type: StrainType
  external_id: string
}

export function mapStrain(
  source: DutchieStrain,
  organizationId: string,
): MappedStrain {
  const normalizedType = source.strainType?.toLowerCase().trim() ?? ''
  const strainType: StrainType = STRAIN_TYPE_MAP[normalizedType] ?? 'hybrid'

  return {
    organization_id: organizationId,
    name: source.strainName,
    strain_type: strainType,
    external_id: String(source.strainId),
  }
}

// --- Vendor ---

export interface MappedVendor {
  organization_id: string
  name: string
  license: string | null
  phone: string | null
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  external_id: string
}

export function mapVendor(
  source: DutchieVendor,
  organizationId: string,
): MappedVendor {
  return {
    organization_id: organizationId,
    name: source.vendorName,
    license: source.license ?? null,
    phone: source.phone ?? null,
    email: source.email ?? null,
    address_line1: source.address ?? null,
    city: source.city ?? null,
    state: source.state ?? null,
    postal_code: source.zip ?? null,
    external_id: String(source.vendorId),
  }
}

// --- Category ---

export interface MappedCategory {
  organization_id: string
  name: string
  slug: string
  available_for: AvailableFor
  external_id: string
}

export function mapCategory(
  source: DutchieCategory,
  organizationId: string,
): MappedCategory {
  return {
    organization_id: organizationId,
    name: source.categoryName,
    slug: generateSlug(source.categoryName, source.categoryId),
    available_for: 'all',
    external_id: String(source.categoryId),
  }
}

// --- Tag ---

export interface MappedTag {
  organization_id: string
  name: string
  tag_type: TagType
  external_id: string
}

export function mapTag(
  source: DutchieTag,
  organizationId: string,
  tagType: TagType = 'product',
): MappedTag {
  return {
    organization_id: organizationId,
    name: source.tagName,
    tag_type: tagType,
    external_id: String(source.tagId),
  }
}

// --- Pricing Tier ---

export interface MappedPricingTier {
  organization_id: string
  name: string
  multiplier: number
  external_id: string
}

export function mapPricingTier(
  source: DutchiePricingTier,
  organizationId: string,
): MappedPricingTier {
  return {
    organization_id: organizationId,
    name: source.pricingTierName,
    multiplier: source.multiplier ?? 1,
    external_id: String(source.pricingTierId),
  }
}

// --- Terminal (Register) ---

export interface MappedRegister {
  location_id: string
  name: string
  external_id: string
  is_active: boolean
}

export function mapTerminal(
  source: DutchieTerminal,
  locationId: string,
): MappedRegister {
  return {
    location_id: locationId,
    name: source.terminalName,
    external_id: String(source.terminalId),
    is_active: source.isActive,
  }
}
