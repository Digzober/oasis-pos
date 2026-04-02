// Core entities
export interface DutchieEmployee {
  employeeId: number
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string | null
  isActive: boolean
  locationNames: string[] | null
  [key: string]: unknown
}

export interface DutchieCustomer {
  customerId: number
  uniqueId: string | null
  firstName: string | null
  lastName: string | null
  middleName: string | null
  namePrefix: string | null
  nameSuffix: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  cellPhone: string | null
  emailAddress: string | null
  status: string | null
  mmjidNumber: string | null
  mmjidExpirationDate: string | null
  customerType: string | null
  gender: string | null
  dateOfBirth: string | null
  notes: string | null
  customIdentifier: string | null
  isLoyaltyMember: boolean
  isAnonymous: boolean
  lastTransactionDate: string | null
  creationDate: string | null
  lastModifiedDateUTC: string | null
  discountGroups: string[] | null
  primaryQualifyingCondition: string | null
  secondaryQualifyingConditions: string[] | null
  referralSource: string | null
  otherReferralSource: string | null
  springBigMemberId: number | null
  driversLicenseHash: string | null
  externalCustomerId: string | null
  createdAtLocation: string | null
}

export interface DutchieProduct {
  productId: number
  globalProductId: string | null
  productName: string
  internalName: string | null
  description: string | null
  sku: string | null
  upc: string | null
  masterCategory: string | null
  category: string | null
  categoryId: number | null
  strain: string | null
  strainId: number | null
  strainType: string | null
  brandName: string | null
  brandId: number | null
  vendorName: string | null
  vendorId: number | null
  isCannabis: boolean
  isActive: boolean
  price: number | null
  medPrice: number | null
  recPrice: number | null
  unitCost: number | null
  thcContent: string | null
  thcContentUnit: string | null
  cbdContent: string | null
  cbdContentUnit: string | null
  productGrams: number | null
  flowerEquivalent: number | null
  unitType: string | null
  onlineTitle: string | null
  onlineDescription: string | null
  onlineProduct: boolean
  posProducts: boolean
  onlineAvailable: boolean
  flavor: string | null
  alternateName: string | null
  dosage: string | null
  instructions: string | null
  allergens: string | null
  standardAllergens: Record<string, boolean> | null
  producerId: number | null
  producerName: string | null
  isTaxable: boolean
  regulatoryCategory: string | null
  externalCategory: string | null
  administrationMethod: string | null
  unitCBDContentDose: number | null
  unitTHCContentDose: number | null
  ingredientList: string | null
  allowAutomaticDiscounts: boolean
  grossWeight: number | null
  netWeight: number | null
  netWeightUnit: string | null
  size: string | null
  oilVolume: number | null
  servingSize: string | null
  servingSizePerUnit: number | null
  isCoupon: boolean
  maxPurchaseablePerTransaction: number | null
  imageUrl: string | null
  imageUrls: string[] | null
  tags: string[] | null
  pricingTier: string | null
  pricingTierName: string | null
  isMedicalOnly: boolean
  isOnSale: boolean
  salePrice: number | null
  availableFor: string | null
  lastModifiedDateUTC: string | null
}

export interface DutchieInventoryItem {
  inventoryId: number
  productId: number
  productName: string | null
  brandName: string | null
  category: string | null
  strain: string | null
  strainType: string | null
  sku: string | null
  barcode: string | null
  batchNumber: string | null
  lotNumber: string | null
  packageId: string | null
  quantityAvailable: number
  allocatedQuantity: number | null
  unitCost: number | null
  unitPrice: number | null
  medUnitPrice: number | null
  recUnitPrice: number | null
  room: string | null
  expirationDate: string | null
  receivedDate: string | null
  testingStatus: string | null
  thcContent: string | null
  cbdContent: string | null
  productGrams: number | null
  flowerEquivalent: number | null
  labResults: Record<string, unknown> | null
  [key: string]: unknown
}

export interface DutchieRoom {
  roomId: number
  roomName: string
  roomType: string | null
  subRooms: Array<{ subRoomId: number; subRoomName: string }> | null
  [key: string]: unknown
}

export interface DutchieBrand {
  brandId: number
  brandName: string
  description: string | null
  imageUrl: string | null
  [key: string]: unknown
}

export interface DutchieStrain {
  strainId: number
  strainName: string
  strainType: string | null
  indica: number | null
  sativa: number | null
  [key: string]: unknown
}

export interface DutchieVendor {
  vendorId: number
  vendorName: string
  license: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  [key: string]: unknown
}

export interface DutchieCategory {
  categoryId: number
  categoryName: string
  parentCategoryId: number | null
  [key: string]: unknown
}

export interface DutchieTag {
  tagId: number
  tagName: string
  tagColor: string | null
  [key: string]: unknown
}

export interface DutchiePricingTier {
  pricingTierId: number
  pricingTierName: string
  multiplier: number | null
  [key: string]: unknown
}

export interface DutchieTerminal {
  terminalId: number
  terminalName: string
  isActive: boolean
  [key: string]: unknown
}

export interface DutchieDiscount {
  discountId: number
  discountName: string
  discountType: string | null
  amount: number | null
  isAutomatic: boolean
  isActive: boolean
  [key: string]: unknown
}

// Sync result tracking
export interface SyncResult {
  entityType: string
  syncType: 'full' | 'incremental'
  fetched: number
  created: number
  updated: number
  skipped: number
  errored: number
  errors: string[]
  durationMs: number
}

export interface LocationSyncResult {
  locationId: string
  locationName: string
  results: SyncResult[]
  totalDurationMs: number
}

export type EntityType = 'employees' | 'customers' | 'products' | 'inventory' | 'rooms' | 'reference'
