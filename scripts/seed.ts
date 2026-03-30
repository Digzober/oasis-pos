import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Supabase client (service role – bypasses RLS)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function fakeBiotrackBarcode(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('')
}

function sku8(): string {
  return String(randomInt(10000000, 99999999))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insert(table: string, rows: any): Promise<any[]> {
  const { data, error } = await sb.from(table).insert(rows).select()
  if (error) {
    console.error(`  ✗ ${table}:`, error.message)
    throw error
  }
  return data!
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱 Oasis POS Seed Script')
  console.log('========================\n')

  // ── Idempotency check ─────────────────────────────────────────────────
  const { data: existingOrg } = await sb
    .from('organizations')
    .select('id')
    .eq('name', 'Oasis Cannabis Co')
    .maybeSingle()

  if (existingOrg) {
    console.log('✓ Database already seeded (organization exists). Exiting.')
    process.exit(0)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. Organization
  // ══════════════════════════════════════════════════════════════════════
  console.log('1. Creating organization...')
  const [org] = await insert('organizations', {
    name: 'Oasis Cannabis Co',
    legal_name: 'OCC ABQ LLC',
    primary_contact_email: 'admin@oasisvape.com',
    primary_contact_phone: '505-255-5100',
  })
  const orgId = org.id as string
  console.log(`  ✓ Organization: ${orgId}`)

  // ══════════════════════════════════════════════════════════════════════
  // 2. Locations
  // ══════════════════════════════════════════════════════════════════════
  console.log('2. Creating locations...')
  const locationData = [
    { name: 'Oasis Cannabis Co - Juan Tabo', address_line1: '8015 Juan Tabo Blvd NE', city: 'Albuquerque', zip: '87111', license_number: 'NMCCD-1001', allows_online_orders: true },
    { name: 'Oasis Cannabis Co - Lomas', address_line1: '3901 Central Ave NE', city: 'Albuquerque', zip: '87108', license_number: 'NMCCD-1002', allows_online_orders: true },
    { name: 'Oasis Cannabis - Midtown', address_line1: '6001 San Mateo Blvd NE', city: 'Albuquerque', zip: '87109', license_number: 'NMCCD-1003', allows_online_orders: true },
    { name: 'Oasis - Coors', address_line1: '5201 Coors Blvd NW', city: 'Albuquerque', zip: '87120', license_number: 'NMCCD-1004', allows_online_orders: true },
    { name: 'Oasis Cannabis UNM Area', address_line1: '106 Girard Blvd SE', city: 'Albuquerque', zip: '87106', license_number: 'NMCCD-1005', allows_online_orders: true },
    { name: 'Oasis Cannabis Pennsylvania', address_line1: '4200 Pennsylvania Ave NE', city: 'Albuquerque', zip: '87110', license_number: 'NMCCD-1006', allows_online_orders: true },
    { name: 'Oasis Cannabis Osuna', address_line1: '5601 Osuna Rd NE', city: 'Albuquerque', zip: '87109', license_number: 'NMCCD-1007', allows_online_orders: true },
    { name: 'Oasis Cannabis Hobbs', address_line1: '1420 N Turner St', city: 'Hobbs', zip: '88240', license_number: 'NMCCD-1008', allows_online_orders: true },
    { name: 'Oasis Cannabis Portales', address_line1: '801 S Avenue D', city: 'Portales', zip: '88130', license_number: 'NMCCD-1009', allows_online_orders: true },
    { name: 'Oasis Cannabis Clovis', address_line1: '2101 N Prince St', city: 'Clovis', zip: '88101', license_number: 'NMCCD-1010', allows_online_orders: true },
    { name: 'Oasis Cannabis Roswell', address_line1: '3200 N Main St', city: 'Roswell', zip: '88201', license_number: 'NMCCD-1011', allows_online_orders: true },
    { name: 'Oasis Cannabis Las Vegas', address_line1: '1801 7th St', city: 'Las Vegas', zip: '87701', license_number: 'NMCCD-1012', allows_online_orders: true },
    { name: 'Oasis Cannabis Belen', address_line1: '614 Becker Ave', city: 'Belen', zip: '87002', license_number: 'NMCCD-1013', allows_online_orders: true },
    { name: 'Oasis Cannabis Co - Farmington', address_line1: '4601 E Main St', city: 'Farmington', zip: '87402', license_number: 'NMCCD-1014', allows_online_orders: true },
    { name: 'Oasis - Warehouse / MIP', address_line1: '2920 Los Arboles Ave NE', city: 'Albuquerque', zip: '87107', license_number: 'NMCCD-1015', allows_online_orders: false },
    { name: 'Oasis - Delivery', address_line1: '2920 Los Arboles Ave NE', city: 'Albuquerque', zip: '87107', license_number: 'NMCCD-1016', allows_delivery: true, allows_online_orders: false },
  ]

  const locations = await insert(
    'locations',
    locationData.map((l) => ({
      organization_id: orgId,
      state: 'NM',
      timezone: 'America/Denver',
      allows_delivery: l.allows_delivery ?? false,
      allows_online_orders: l.allows_online_orders ?? false,
      name: l.name,
      address_line1: l.address_line1,
      city: l.city,
      zip: l.zip,
      license_number: l.license_number,
    })),
  )
  console.log(`  ✓ ${locations.length} locations`)

  // Build a lookup for convenience
  const loc = Object.fromEntries(locations.map((l) => [l.name as string, l.id as string]))
  const coorsId = loc['Oasis - Coors']
  const retailLocations = locations.filter(
    (l) => l.name !== 'Oasis - Warehouse / MIP' && l.name !== 'Oasis - Delivery',
  )

  // ══════════════════════════════════════════════════════════════════════
  // 3. Tax Categories
  // ══════════════════════════════════════════════════════════════════════
  console.log('3. Creating tax categories...')
  const taxCategories = await insert('tax_categories', [
    { name: 'Cannabis', organization_id: orgId },
    { name: 'Non-Cannabis', organization_id: orgId },
  ])
  const taxCatMap = Object.fromEntries(taxCategories.map((t) => [t.name as string, t.id as string]))
  console.log(`  ✓ ${taxCategories.length} tax categories`)

  // ══════════════════════════════════════════════════════════════════════
  // 4. Product Categories (24 from Dutchie feature map)
  // ══════════════════════════════════════════════════════════════════════
  console.log('4. Creating product categories...')
  const catDefs = [
    { name: 'Accessories - Batteries/Vaporizers', master_category: 'Accessories', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Accessories - Grinders', master_category: 'Accessories', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Accessories - Lighters/Ashtrays', master_category: 'Accessories', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Accessories - Clothing', master_category: 'Accessories', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Beverages', master_category: 'Edibles', purchase_limit_category: null, tax_category: 'Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Carts', master_category: 'Cartridges', purchase_limit_category: 'Concentrates', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'VAPORIZED CANNABIS (V) - Oil' },
    { name: 'Concentrates', master_category: 'Concentrates', purchase_limit_category: 'Concentrates', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Hash & Keif' },
    { name: 'Concentrates (OCC)', master_category: 'Concentrates', purchase_limit_category: 'Concentrates', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Hash & Keif' },
    { name: 'Disposable Vapes', master_category: 'Disposables', purchase_limit_category: 'Concentrates', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'VAPORIZED CANNABIS (V) - Oil' },
    { name: 'Edibles', master_category: 'Edibles', purchase_limit_category: 'Edibles', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'EDIBLE CANNABIS (E) - Candies' },
    { name: 'Edibles (RSO)', master_category: 'Edibles', purchase_limit_category: 'Edibles', tax_category: 'Cannabis', available_for: 'medical', regulatory_category: 'VAPORIZED CANNABIS (V) - Oil' },
    { name: 'Flower Pre-Pack', master_category: 'Flower', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Flower Pre-Pack (OCC)', master_category: 'Flower', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Glass - Accessories', master_category: 'Glass', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Glass - Bongs/Hand Pipes', master_category: 'Glass', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Infused Pre-Rolls', master_category: 'Pre-Rolls', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Infused Pre-Rolls (OCC)', master_category: 'Pre-Rolls', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Kief', master_category: 'Kief', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Hash & Keif' },
    { name: 'Moon Rocks', master_category: 'Moon Rocks', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Oral', master_category: 'Oral', purchase_limit_category: 'Edibles', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'EDIBLE CANNABIS (E) - Oral Spray' },
    { name: 'Pre-Rolls', master_category: 'Pre-Rolls', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Pre-Rolls (OCC)', master_category: 'Pre-Rolls', purchase_limit_category: 'Flower', tax_category: 'Cannabis', available_for: 'all', regulatory_category: 'SMOKED CANNABIS (S) - Flowers & Buds' },
    { name: 'Topicals', master_category: 'Topicals', purchase_limit_category: 'Concentrates', tax_category: 'Cannabis', available_for: 'all', regulatory_category: null },
    { name: 'Wraps/Papers', master_category: 'Wraps/Papers', purchase_limit_category: null, tax_category: 'Non-Cannabis', available_for: 'all', regulatory_category: null },
  ]

  const categories = await insert(
    'product_categories',
    catDefs.map((c, i) => ({
      organization_id: orgId,
      name: c.name,
      slug: slugify(c.name),
      master_category: c.master_category,
      purchase_limit_category: c.purchase_limit_category,
      tax_category: c.tax_category,
      available_for: c.available_for,
      regulatory_category: c.regulatory_category,
      sort_order: i + 1,
    })),
  )
  const catMap = Object.fromEntries(categories.map((c) => [c.name as string, c.id as string]))
  console.log(`  ✓ ${categories.length} product categories`)

  // ══════════════════════════════════════════════════════════════════════
  // 5. Brands
  // ══════════════════════════════════════════════════════════════════════
  console.log('5. Creating brands...')
  const brandNames = ['Zips', 'Pecos Valley', 'Sacred Garden', 'Nirvana', 'Left Coast', 'Everest', 'Kure', 'High Desert Relief', 'INSA', 'Oasis']
  const brands = await insert(
    'brands',
    brandNames.map((name) => ({ name, organization_id: orgId })),
  )
  const brandMap = Object.fromEntries(brands.map((b) => [b.name as string, b.id as string]))
  console.log(`  ✓ ${brands.length} brands`)

  // ══════════════════════════════════════════════════════════════════════
  // 6. Strains
  // ══════════════════════════════════════════════════════════════════════
  console.log('6. Creating strains...')
  const strainDefs = [
    { name: 'Blue Dream', strain_type: 'hybrid' },
    { name: 'OG Kush', strain_type: 'indica' },
    { name: 'Sour Diesel', strain_type: 'sativa' },
    { name: 'Girl Scout Cookies', strain_type: 'hybrid' },
    { name: 'Jack Herer', strain_type: 'sativa' },
    { name: 'Granddaddy Purple', strain_type: 'indica' },
    { name: 'Gorilla Glue', strain_type: 'hybrid' },
    { name: 'Wedding Cake', strain_type: 'hybrid' },
    { name: 'Green Crack', strain_type: 'sativa' },
    { name: 'Northern Lights', strain_type: 'indica' },
  ]
  const strains = await insert(
    'strains',
    strainDefs.map((s) => ({ ...s, organization_id: orgId })),
  )
  const strainMap = Object.fromEntries(strains.map((s) => [s.name as string, s.id as string]))
  console.log(`  ✓ ${strains.length} strains`)

  // ══════════════════════════════════════════════════════════════════════
  // 7. Rooms (per retail location)
  // ══════════════════════════════════════════════════════════════════════
  console.log('7. Creating rooms...')
  const roomInserts = retailLocations.flatMap((l) => [
    {
      location_id: l.id as string,
      name: 'Sales Floor',
      room_types: ['sales_floor', 'pos_room', 'ecommerce_room'],
      accessible_by_menu: true,
    },
    {
      location_id: l.id as string,
      name: 'Vault',
      room_types: ['inventory_room'],
      accessible_by_menu: false,
    },
  ])
  const rooms = await insert('rooms', roomInserts)
  console.log(`  ✓ ${rooms.length} rooms`)

  // Coors sales floor room
  const coorsSalesFloor = rooms.find(
    (r) => r.location_id === coorsId && r.name === 'Sales Floor',
  )!

  // ══════════════════════════════════════════════════════════════════════
  // 8. Registers (per retail location) + register_rooms linkage
  // ══════════════════════════════════════════════════════════════════════
  console.log('8. Creating registers...')
  const registerInserts = retailLocations.flatMap((l) => [
    { location_id: l.id as string, name: 'Register 1', auto_print_receipts: true },
    { location_id: l.id as string, name: 'Register 2', auto_print_receipts: true },
  ])
  const registers = await insert('registers', registerInserts)
  console.log(`  ✓ ${registers.length} registers`)

  // Link registers to sales floor rooms
  console.log('   Linking registers to rooms...')
  const salesFloorByLocation = Object.fromEntries(
    rooms.filter((r) => r.name === 'Sales Floor').map((r) => [r.location_id as string, r.id as string]),
  )
  const registerRoomInserts = registers.map((reg) => ({
    register_id: reg.id as string,
    room_id: salesFloorByLocation[reg.location_id as string],
  }))
  await insert('register_rooms', registerRoomInserts)
  console.log(`  ✓ ${registerRoomInserts.length} register_rooms links`)

  // ══════════════════════════════════════════════════════════════════════
  // 9. Permission Definitions (222 across key categories)
  // ══════════════════════════════════════════════════════════════════════
  console.log('9. Creating permission definitions...')

  type PermDef = { category: string; sub_category: string; name: string; code: string }
  const permDefs: PermDef[] = []

  // Helper to add permissions
  const addPerms = (category: string, sub_category: string, perms: [string, string][]) => {
    perms.forEach(([name, code]) => permDefs.push({ category, sub_category, name, code }))
  }

  // ── General (12) ──────────────────────────────────────────────────────
  addPerms('General', 'Administration', [
    ['Administrator', 'GENERAL_ADMIN_ADMINISTRATOR'],
    ['Assign Permissions', 'GENERAL_ADMIN_ASSIGN_PERMISSIONS'],
    ['POS Manager', 'GENERAL_ADMIN_POS_MANAGER'],
    ['Assign Users to Groups', 'GENERAL_ADMIN_ASSIGN_USERS_TO_GROUPS'],
    ['View Permissions', 'GENERAL_ADMIN_VIEW_PERMISSIONS'],
    ['Override Discounts', 'GENERAL_ADMIN_OVERRIDE_DISCOUNTS'],
  ])
  addPerms('General', 'Login', [
    ['Login to Backend', 'GENERAL_LOGIN_BACKEND'],
    ['Login to POS', 'GENERAL_LOGIN_POS'],
    ['Login to Storefront', 'GENERAL_LOGIN_STOREFRONT'],
    ['Log In to Mobile Checkout', 'GENERAL_LOGIN_MOBILE_CHECKOUT'],
  ])
  addPerms('General', 'Administrator', [
    ['View Read-only Feature Flags', 'GENERAL_ADMIN_VIEW_FEATURE_FLAGS'],
    ['View Org Management', 'GENERAL_ADMIN_VIEW_ORG_MANAGEMENT'],
  ])

  // ── POS (36) ──────────────────────────────────────────────────────────
  addPerms('POS', 'POS Backend', [
    ['View POS Summary', 'POS_BACKEND_VIEW_POS_SUMMARY'],
    ['View Register Transaction Data', 'POS_BACKEND_VIEW_REGISTER_TRANSACTIONS'],
    ['Adjust Register', 'POS_BACKEND_ADJUST_REGISTER'],
    ['Close Out Register', 'POS_BACKEND_CLOSE_REGISTER'],
    ['View Closing Report', 'POS_BACKEND_VIEW_CLOSING_REPORT'],
    ['View POS', 'POS_BACKEND_VIEW_POS'],
    ['Allow Transfer Between Registers', 'POS_BACKEND_TRANSFER_REGISTERS'],
    ['Edit Vault Register', 'POS_BACKEND_EDIT_VAULT_REGISTER'],
    ['View Vault Register', 'POS_BACKEND_VIEW_VAULT_REGISTER'],
    ['Edit Purchase Limits', 'POS_BACKEND_EDIT_PURCHASE_LIMITS'],
    ['View Multi-Locations Sales Reports', 'POS_BACKEND_VIEW_MULTI_LOCATION_SALES'],
    ['Undo Register Close Out', 'POS_BACKEND_UNDO_REGISTER_CLOSE'],
  ])
  addPerms('POS', 'POS Maintenance', [
    ['Edit Discounts', 'POS_MAINT_EDIT_DISCOUNTS'],
    ['View Discounts', 'POS_MAINT_VIEW_DISCOUNTS'],
    ['Edit Discount Groups', 'POS_MAINT_EDIT_DISCOUNT_GROUPS'],
    ['View Discount Groups', 'POS_MAINT_VIEW_DISCOUNT_GROUPS'],
    ['Edit Doctors', 'POS_MAINT_EDIT_DOCTORS'],
    ['View Doctors', 'POS_MAINT_VIEW_DOCTORS'],
    ['Edit Pricing', 'POS_MAINT_EDIT_PRICING'],
    ['View Pricing', 'POS_MAINT_VIEW_PRICING'],
    ['Edit Registers', 'POS_MAINT_EDIT_REGISTERS'],
    ['View Registers', 'POS_MAINT_VIEW_REGISTERS'],
    ['Edit Transaction Adjustment Reasons', 'POS_MAINT_EDIT_ADJUSTMENT_REASONS'],
    ['Edit POS Customer Status', 'POS_MAINT_EDIT_CUSTOMER_STATUS'],
    ['View POS Customer Status', 'POS_MAINT_VIEW_CUSTOMER_STATUS'],
    ['Edit Fees and Donations', 'POS_MAINT_EDIT_FEES_DONATIONS'],
    ['View Fees and Donations', 'POS_MAINT_VIEW_FEES_DONATIONS'],
    ['Verify Transaction', 'POS_MAINT_VERIFY_TRANSACTION'],
    ['Edit Discount Group Customers', 'POS_MAINT_EDIT_DISCOUNT_GROUP_CUSTOMERS'],
    ['View Batch Id Identity Format', 'POS_MAINT_VIEW_BATCH_ID_FORMAT'],
    ['Edit Batch Id Identity Format', 'POS_MAINT_EDIT_BATCH_ID_FORMAT'],
    ['View Delivery Title Identity Format', 'POS_MAINT_VIEW_DELIVERY_TITLE_FORMAT'],
    ['Edit Delivery Title Identity Format', 'POS_MAINT_EDIT_DELIVERY_TITLE_FORMAT'],
    ['Edit External Websites', 'POS_MAINT_EDIT_EXTERNAL_WEBSITES'],
    ['View Loyalty Accrual', 'POS_MAINT_VIEW_LOYALTY_ACCRUAL'],
    ['Edit Loyalty Accrual', 'POS_MAINT_EDIT_LOYALTY_ACCRUAL'],
  ])

  // ── Inventory (85) ────────────────────────────────────────────────────
  addPerms('Inventory', 'Core', [
    ['View Inventory Costs', 'INV_CORE_VIEW_COSTS'],
    ['Adjust Inventory', 'INV_CORE_ADJUST'],
    ['Create Batch', 'INV_CORE_CREATE_BATCH'],
    ['Assign Batch', 'INV_CORE_ASSIGN_BATCH'],
    ['Move Inventory', 'INV_CORE_MOVE'],
    ['Combine Inventory', 'INV_CORE_COMBINE'],
    ['Convert Inventory', 'INV_CORE_CONVERT'],
    ['Print Labels', 'INV_CORE_PRINT_LABELS'],
    ['Change Inventory Product', 'INV_CORE_CHANGE_PRODUCT'],
    ['Create Packages', 'INV_CORE_CREATE_PACKAGES'],
    ['Sublot', 'INV_CORE_SUBLOT'],
    ['Destroy Inventory', 'INV_CORE_DESTROY'],
    ['View Lab Samples', 'INV_CORE_VIEW_LAB_SAMPLES'],
    ['Edit Lab Samples', 'INV_CORE_EDIT_LAB_SAMPLES'],
    ['Discontinue Package', 'INV_CORE_DISCONTINUE_PACKAGE'],
    ['Bypass State System - Adjust', 'INV_CORE_BYPASS_STATE_ADJUST'],
    ['Bypass State System - Move', 'INV_CORE_BYPASS_STATE_MOVE'],
    ['Bypass State System - Convert', 'INV_CORE_BYPASS_STATE_CONVERT'],
    ['Bypass State System - Destroy', 'INV_CORE_BYPASS_STATE_DESTROY'],
    ['Bypass State System - Create Package', 'INV_CORE_BYPASS_STATE_CREATE_PACKAGE'],
    ['Move Inventory Location', 'INV_CORE_MOVE_LOCATION'],
    ['Edit Receive History', 'INV_CORE_EDIT_RECEIVE_HISTORY'],
    ['Edit Package Tags', 'INV_CORE_EDIT_PACKAGE_TAGS'],
    ['Manage Pre-order Allocation', 'INV_CORE_MANAGE_PREORDER_ALLOCATION'],
  ])
  addPerms('Inventory', 'Reconciliation', [
    ['View Integration Reconciliation', 'INV_RECON_VIEW'],
    ['Create Integration Reconciliation', 'INV_RECON_CREATE'],
  ])
  addPerms('Inventory', 'Manifest', [
    ['Create Manifest', 'INV_MANIFEST_CREATE'],
    ['Add Items to Manifest', 'INV_MANIFEST_ADD_ITEMS'],
    ['Delete Manifest', 'INV_MANIFEST_DELETE'],
    ['Close Manifest', 'INV_MANIFEST_CLOSE'],
    ['Edit Manifest', 'INV_MANIFEST_EDIT'],
    ['Print Manifest', 'INV_MANIFEST_PRINT'],
    ['View Manifest', 'INV_MANIFEST_VIEW'],
    ['Reopen Manifest', 'INV_MANIFEST_REOPEN'],
  ])
  addPerms('Inventory', 'Recipes', [
    ['Edit Recipe', 'INV_RECIPES_EDIT'],
    ['View Infusions', 'INV_RECIPES_VIEW_INFUSIONS'],
    ['Edit Infusions', 'INV_RECIPES_EDIT_INFUSIONS'],
  ])
  addPerms('Inventory', 'Purchase Orders', [
    ['Edit PO Approval Threshold', 'INV_PO_EDIT_THRESHOLD'],
    ['View PO Approval Threshold', 'INV_PO_VIEW_THRESHOLD'],
    ['Approve Purchase Orders', 'INV_PO_APPROVE'],
    ['View PO Approval Grid', 'INV_PO_VIEW_APPROVAL_GRID'],
  ])
  addPerms('Inventory', 'Retail ID', [
    ['Fetch Retail IDs', 'INV_RETAIL_ID_FETCH'],
    ['Generate Retail IDs', 'INV_RETAIL_ID_GENERATE'],
    ['View Retail IDs', 'INV_RETAIL_ID_VIEW'],
    ['Print Retail IDs', 'INV_RETAIL_ID_PRINT'],
  ])
  addPerms('Inventory', 'Bill of Materials', [
    ['View Bill of Materials', 'INV_BOM_VIEW'],
    ['Edit Bill of Materials', 'INV_BOM_EDIT'],
    ['View Assembly', 'INV_BOM_VIEW_ASSEMBLY'],
    ['Edit Assembly', 'INV_BOM_EDIT_ASSEMBLY'],
  ])
  addPerms('Inventory', 'Invoices', [
    ['View Invoices', 'INV_INVOICES_VIEW'],
    ['Edit Invoices', 'INV_INVOICES_EDIT'],
    ['Delete Invoices', 'INV_INVOICES_DELETE'],
    ['View Invoice Payments', 'INV_INVOICES_VIEW_PAYMENTS'],
    ['Edit Invoice Payments', 'INV_INVOICES_EDIT_PAYMENTS'],
    ['Delete Invoice Payments', 'INV_INVOICES_DELETE_PAYMENTS'],
    ['Accept Invoice Payments', 'INV_INVOICES_ACCEPT_PAYMENTS'],
    ['Reject Invoice Payments', 'INV_INVOICES_REJECT_PAYMENTS'],
  ])

  // ── Maintenance (77) ──────────────────────────────────────────────────
  addPerms('Maintenance', 'Products', [
    ['Create Product', 'MAINT_PRODUCTS_CREATE'],
    ['View Product Detail', 'MAINT_PRODUCTS_VIEW_DETAIL'],
    ['Edit Product Detail', 'MAINT_PRODUCTS_EDIT_DETAIL'],
    ['Manage Retired Products', 'MAINT_PRODUCTS_MANAGE_RETIRED'],
    ['Edit Product Categories', 'MAINT_PRODUCTS_EDIT_CATEGORIES'],
    ['View Product Master', 'MAINT_PRODUCTS_VIEW_MASTER'],
    ['Edit Dosages', 'MAINT_PRODUCTS_EDIT_DOSAGES'],
    ['Edit Sizes', 'MAINT_PRODUCTS_EDIT_SIZES'],
    ['Edit Location Product Master', 'MAINT_PRODUCTS_EDIT_LOCATION_MASTER'],
    ['Edit Lineages', 'MAINT_PRODUCTS_EDIT_LINEAGES'],
    ['Edit Distillations', 'MAINT_PRODUCTS_EDIT_DISTILLATIONS'],
  ])
  addPerms('Maintenance', 'Customers', [
    ['View Customers', 'MAINT_CUSTOMERS_VIEW'],
    ['Edit Customers', 'MAINT_CUSTOMERS_EDIT'],
    ['Merge Customer', 'MAINT_CUSTOMERS_MERGE'],
    ['Edit Patient Journal Entries', 'MAINT_CUSTOMERS_EDIT_JOURNAL'],
    ['View Patient Journal Entries', 'MAINT_CUSTOMERS_VIEW_JOURNAL'],
    ['View Customer Types', 'MAINT_CUSTOMERS_VIEW_TYPES'],
    ['Edit Customer Types', 'MAINT_CUSTOMERS_EDIT_TYPES'],
    ['View Segments', 'MAINT_CUSTOMERS_VIEW_SEGMENTS'],
    ['Edit Segments', 'MAINT_CUSTOMERS_EDIT_SEGMENTS'],
  ])
  addPerms('Maintenance', 'Configuration Data', [
    ['Edit Cars', 'MAINT_CONFIG_EDIT_CARS'],
    ['View Cars', 'MAINT_CONFIG_VIEW_CARS'],
    ['Edit Drivers', 'MAINT_CONFIG_EDIT_DRIVERS'],
    ['View Drivers', 'MAINT_CONFIG_VIEW_DRIVERS'],
    ['Edit Tax Rates', 'MAINT_CONFIG_EDIT_TAX_RATES'],
    ['View Tax Rates', 'MAINT_CONFIG_VIEW_TAX_RATES'],
    ['Edit Return Reasons', 'MAINT_CONFIG_EDIT_RETURN_REASONS'],
    ['Edit Package Identity Format', 'MAINT_CONFIG_EDIT_PACKAGE_FORMAT'],
    ['Edit Product SKU Format', 'MAINT_CONFIG_EDIT_SKU_FORMAT'],
    ['Edit Brands', 'MAINT_CONFIG_EDIT_BRANDS'],
    ['View Rooms', 'MAINT_CONFIG_VIEW_ROOMS'],
    ['View Strains', 'MAINT_CONFIG_VIEW_STRAINS'],
    ['View Vendors', 'MAINT_CONFIG_VIEW_VENDORS'],
    ['View Tables', 'MAINT_CONFIG_VIEW_TABLES'],
    ['View Reason Codes', 'MAINT_CONFIG_VIEW_REASON_CODES'],
    ['View Inventory Status', 'MAINT_CONFIG_VIEW_INVENTORY_STATUS'],
    ['Edit Producers', 'MAINT_CONFIG_EDIT_PRODUCERS'],
    ['Edit Flower Equivalency Definition', 'MAINT_CONFIG_EDIT_FLOWER_EQUIV'],
    ['View Flower Equivalency Definition', 'MAINT_CONFIG_VIEW_FLOWER_EQUIV'],
  ])
  addPerms('Maintenance', 'Users', [
    ['Edit Time Clocks', 'MAINT_USERS_EDIT_TIME_CLOCKS'],
    ['View Time Clocks', 'MAINT_USERS_VIEW_TIME_CLOCKS'],
    ['Edit Users', 'MAINT_USERS_EDIT'],
    ['View Users', 'MAINT_USERS_VIEW'],
    ['Reset User Passwords', 'MAINT_USERS_RESET_PASSWORDS'],
    ['View User State IDs', 'MAINT_USERS_VIEW_STATE_IDS'],
    ['Edit User Pins', 'MAINT_USERS_EDIT_PINS'],
    ['View User Pins', 'MAINT_USERS_VIEW_PINS'],
    ['View User Event Logs', 'MAINT_USERS_VIEW_EVENT_LOGS'],
    ['Bulk Assign User Locations', 'MAINT_USERS_BULK_ASSIGN_LOCATIONS'],
    ['Bulk Assign User Groups', 'MAINT_USERS_BULK_ASSIGN_GROUPS'],
  ])

  // ── Reporting (12) ────────────────────────────────────────────────────
  addPerms('Reporting', 'Dashboards', [
    ['View Dashboard', 'REPORTING_DASHBOARDS_VIEW'],
    ['View Cost of Goods Sold Data', 'REPORTING_DASHBOARDS_VIEW_COGS'],
  ])
  addPerms('Reporting', 'Static Reports', [
    ['View Static Reports', 'REPORTING_STATIC_VIEW'],
    ['Schedule E-mail Reports', 'REPORTING_STATIC_SCHEDULE_EMAIL'],
    ['View BC/AB/SK Reports', 'REPORTING_STATIC_VIEW_REGIONAL'],
  ])
  addPerms('Reporting', 'Report Categories', [
    ['View Sales Reports', 'REPORTING_CAT_VIEW_SALES'],
    ['View Inventory Reports', 'REPORTING_CAT_VIEW_INVENTORY'],
    ['View Employee Reports', 'REPORTING_CAT_VIEW_EMPLOYEE'],
    ['View Marketing Reports', 'REPORTING_CAT_VIEW_MARKETING'],
    ['View Operations Reports', 'REPORTING_CAT_VIEW_OPERATIONS'],
    ['Export Reports', 'REPORTING_CAT_EXPORT'],
    ['Print Reports', 'REPORTING_CAT_PRINT'],
  ])

  // ── Cultivation (35) — stubs ──────────────────────────────────────────
  const cultivationNames = 'View Plants,Create Plants,Edit Plants,Delete Plants,Move Plants,Harvest Plants,Destroy Plants,View Batches,Create Batches,Edit Batches,View Growth Phases,Edit Growth Phases,View Nutrients,Edit Nutrients,View Pest Management,Edit Pest Management,View Watering Schedule,Edit Watering Schedule,View Yield Data,Edit Yield Data,View Mother Plants,Create Clones,View Environmental Data,Edit Environmental Data,View Cultivation Reports,Export Cultivation Data,View Drying,Edit Drying,View Curing,Edit Curing,View Trimming,Edit Trimming,View Waste,Edit Waste,Manage Cultivation Settings'.split(',')
  addPerms('Cultivation', 'Cultivation', cultivationNames.map((n): [string, string] => [n.trim(), `CULTIVATION_${n.trim().toUpperCase().replace(/\s+/g, '_')}`]))

  // ── Integrations (74) — stubs ─────────────────────────────────────────
  const integrationStubs: [string, string][] = Array.from({ length: 74 }, (_, i) => [
    `Integration Permission ${i + 1}`,
    `INTEGRATIONS_PERM_${String(i + 1).padStart(3, '0')}`,
  ])
  addPerms('Integrations', 'Integrations', integrationStubs)

  // ── Compliance (1) ────────────────────────────────────────────────────
  addPerms('Compliance', 'Customer', [
    ['View Customer Info Access Logs', 'COMPLIANCE_VIEW_CUSTOMER_ACCESS_LOGS'],
  ])

  // ── Security (2) ──────────────────────────────────────────────────────
  addPerms('Security', 'Password Settings', [
    ['Edit Password Settings', 'SECURITY_EDIT_PASSWORD_SETTINGS'],
    ['View Password Settings', 'SECURITY_VIEW_PASSWORD_SETTINGS'],
  ])

  // ── Delivery (7) ──────────────────────────────────────────────────────
  addPerms('Delivery', 'Thresholds', [
    ['View Delivery Thresholds', 'DELIVERY_VIEW_THRESHOLDS'],
    ['Edit Delivery Thresholds', 'DELIVERY_EDIT_THRESHOLDS'],
  ])
  addPerms('Delivery', 'Zones', [
    ['View Zones', 'DELIVERY_VIEW_ZONES'],
    ['Edit Zones', 'DELIVERY_EDIT_ZONES'],
  ])
  addPerms('Delivery', 'POS', [
    ['View Routes', 'DELIVERY_VIEW_ROUTES'],
    ['Edit Routes', 'DELIVERY_EDIT_ROUTES'],
  ])
  addPerms('Delivery', 'Delivery', [
    ['Edit Default Delivery Window', 'DELIVERY_EDIT_DEFAULT_WINDOW'],
  ])

  console.log(`  Total permission definitions to insert: ${permDefs.length}`)
  const permissions = await insert('permission_definitions', permDefs)
  console.log(`  ✓ ${permissions.length} permission definitions`)

  const permByCode = Object.fromEntries(
    permissions.map((p) => [p.code as string, p.id as string]),
  )
  const allPermIds = permissions.map((p) => p.id as string)

  // ══════════════════════════════════════════════════════════════════════
  // 10. Permission Groups (8 default groups with permission assignments)
  // ══════════════════════════════════════════════════════════════════════
  console.log('10. Creating permission groups...')

  // Build permission subsets by code pattern
  const permIdsMatching = (patterns: string[]): string[] => {
    return permissions
      .filter((p) => patterns.some((pat) => (p.code as string).startsWith(pat)))
      .map((p) => p.id as string)
  }

  // Bud Tenders (28): Login, basic POS viewing, basic product viewing
  const budtenderPermCodes = [
    'GENERAL_LOGIN_POS', 'GENERAL_LOGIN_STOREFRONT', 'GENERAL_LOGIN_MOBILE_CHECKOUT',
    'POS_BACKEND_VIEW_POS_SUMMARY', 'POS_BACKEND_VIEW_POS', 'POS_BACKEND_VIEW_REGISTER_TRANSACTIONS',
    'POS_MAINT_VIEW_DISCOUNTS', 'POS_MAINT_VIEW_DISCOUNT_GROUPS', 'POS_MAINT_VIEW_PRICING',
    'POS_MAINT_VIEW_REGISTERS', 'POS_MAINT_VIEW_CUSTOMER_STATUS', 'POS_MAINT_VIEW_FEES_DONATIONS',
    'MAINT_PRODUCTS_VIEW_DETAIL', 'MAINT_PRODUCTS_VIEW_MASTER',
    'MAINT_CUSTOMERS_VIEW', 'MAINT_CUSTOMERS_VIEW_TYPES', 'MAINT_CUSTOMERS_VIEW_JOURNAL',
    'MAINT_CONFIG_VIEW_STRAINS', 'MAINT_CONFIG_VIEW_ROOMS', 'MAINT_CONFIG_VIEW_VENDORS',
    'MAINT_CONFIG_VIEW_TAX_RATES', 'MAINT_CONFIG_VIEW_REASON_CODES',
    'INV_CORE_VIEW_COSTS', 'INV_CORE_PRINT_LABELS',
    'REPORTING_DASHBOARDS_VIEW',
    'REPORTING_CAT_VIEW_SALES',
    'POS_MAINT_VIEW_LOYALTY_ACCRUAL',
    'MAINT_CUSTOMERS_VIEW_SEGMENTS',
  ]
  const budtenderPermIds = budtenderPermCodes
    .map((c) => permByCode[c])
    .filter(Boolean)

  // Managers (140): Everything budtenders have + discounts, register mgmt, closing, employee viewing, inventory viewing
  const managerPermIds = [
    ...budtenderPermIds,
    ...permIdsMatching(['GENERAL_ADMIN', 'GENERAL_LOGIN']),
    ...permIdsMatching(['POS_BACKEND', 'POS_MAINT']),
    ...permIdsMatching(['MAINT_']),
    ...permIdsMatching(['REPORTING_']),
    ...permIdsMatching(['INV_CORE_VIEW', 'INV_CORE_ADJUST', 'INV_CORE_PRINT', 'INV_CORE_MOVE']),
    ...permIdsMatching(['INV_MANIFEST_VIEW', 'INV_MANIFEST_PRINT']),
    ...permIdsMatching(['INV_INVOICES_VIEW']),
    ...permIdsMatching(['DELIVERY_VIEW']),
  ]
  const uniqueManagerPermIds = [...new Set(managerPermIds)]

  // Shift Leads: Subset between budtenders and managers
  const shiftLeadPermIds = [
    ...budtenderPermIds,
    ...permIdsMatching(['GENERAL_LOGIN']),
    ...permIdsMatching(['POS_BACKEND']),
    ...permIdsMatching(['POS_MAINT_VIEW', 'POS_MAINT_EDIT_DISCOUNTS', 'POS_MAINT_VERIFY']),
    ...permIdsMatching(['MAINT_PRODUCTS_VIEW', 'MAINT_CUSTOMERS_VIEW', 'MAINT_CUSTOMERS_EDIT']),
    ...permIdsMatching(['MAINT_USERS_VIEW']),
    ...permIdsMatching(['INV_CORE_VIEW', 'INV_CORE_ADJUST', 'INV_CORE_PRINT', 'INV_CORE_MOVE']),
    ...permIdsMatching(['REPORTING_DASHBOARDS', 'REPORTING_CAT_VIEW_SALES']),
  ]
  const uniqueShiftLeadPermIds = [...new Set(shiftLeadPermIds)]

  // Inventory Coordinators: Inventory-heavy
  const invCoordPermIds = [
    ...budtenderPermIds,
    ...permIdsMatching(['INV_']),
    ...permIdsMatching(['MAINT_PRODUCTS']),
    ...permIdsMatching(['MAINT_CONFIG']),
    ...permIdsMatching(['REPORTING_CAT_VIEW_INVENTORY']),
  ]
  const uniqueInvCoordPermIds = [...new Set(invCoordPermIds)]

  // Inventory: Basic inventory
  const inventoryPermIds = [
    ...budtenderPermIds,
    ...permIdsMatching(['INV_CORE', 'INV_MANIFEST_VIEW', 'INV_MANIFEST_PRINT']),
    ...permIdsMatching(['MAINT_PRODUCTS_VIEW']),
  ]
  const uniqueInventoryPermIds = [...new Set(inventoryPermIds)]

  // Accounting: Financial focus
  const accountingPermIds = [
    ...permIdsMatching(['GENERAL_LOGIN']),
    ...permIdsMatching(['POS_BACKEND_VIEW']),
    ...permIdsMatching(['REPORTING_']),
    ...permIdsMatching(['INV_CORE_VIEW_COSTS', 'INV_INVOICES']),
    ...permIdsMatching(['MAINT_CONFIG_VIEW_TAX_RATES']),
  ]
  const uniqueAccountingPermIds = [...new Set(accountingPermIds)]

  // OV Employees: Minimal
  const ovPermIds = [
    ...permIdsMatching(['GENERAL_LOGIN_POS', 'GENERAL_LOGIN_STOREFRONT']),
    ...permIdsMatching(['POS_BACKEND_VIEW_POS_SUMMARY', 'POS_BACKEND_VIEW_POS']),
    ...permIdsMatching(['MAINT_PRODUCTS_VIEW']),
    ...permIdsMatching(['MAINT_CUSTOMERS_VIEW']),
    ...permIdsMatching(['REPORTING_DASHBOARDS_VIEW']),
  ]
  const uniqueOvPermIds = [...new Set(ovPermIds.filter(Boolean))]

  const groupDefs = [
    { name: 'Admin', description: 'Full access to all features', permIds: allPermIds },
    { name: 'Managers', description: 'Store management access', permIds: uniqueManagerPermIds },
    { name: 'Shift Leads', description: 'Shift management and POS access', permIds: uniqueShiftLeadPermIds },
    { name: 'Inventory Coordinators', description: 'Full inventory management access', permIds: uniqueInvCoordPermIds },
    { name: 'Inventory', description: 'Basic inventory operations', permIds: uniqueInventoryPermIds },
    { name: 'Bud Tenders', description: 'POS and customer-facing operations', permIds: budtenderPermIds },
    { name: 'Accounting', description: 'Financial reports and invoices', permIds: uniqueAccountingPermIds },
    { name: 'OV Employees', description: 'Minimal read-only access', permIds: uniqueOvPermIds },
  ]

  const permGroups = await insert(
    'permission_groups',
    groupDefs.map((g) => ({
      name: g.name,
      description: g.description,
      organization_id: orgId,
      is_system_default: true,
    })),
  )
  const groupMap = Object.fromEntries(permGroups.map((g) => [g.name as string, g.id as string]))
  console.log(`  ✓ ${permGroups.length} permission groups`)

  // Link permissions to groups
  console.log('   Linking permissions to groups...')
  for (const gDef of groupDefs) {
    const groupId = groupMap[gDef.name]
    const links = gDef.permIds.map((permId) => ({
      permission_group_id: groupId,
      permission_id: permId,
    }))
    if (links.length > 0) {
      // Insert in batches of 500 to avoid payload limits
      for (let i = 0; i < links.length; i += 500) {
        await insert('permission_group_permissions', links.slice(i, i + 500))
      }
    }
    console.log(`   ✓ ${gDef.name}: ${links.length} permissions`)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 11. Sample Employees
  // ══════════════════════════════════════════════════════════════════════
  console.log('11. Creating employees...')
  const employeeDefs = [
    { first_name: 'Kane', last_name: 'Oueis', role: 'owner', pin: '1234', group: 'Admin' },
    { first_name: 'Manager', last_name: 'Mike', role: 'manager', pin: '5678', group: 'Managers' },
    { first_name: 'Shift Lead', last_name: 'Sarah', role: 'shift_lead', pin: '9012', group: 'Shift Leads' },
    { first_name: 'Budtender', last_name: 'Bob', role: 'budtender', pin: '3456', group: 'Bud Tenders' },
    { first_name: 'Budtender', last_name: 'Jane', role: 'budtender', pin: '7890', group: 'Bud Tenders' },
  ]

  const employees = await insert(
    'employees',
    employeeDefs.map((e) => ({
      first_name: e.first_name,
      last_name: e.last_name,
      role: e.role,
      pin_hash: hashPin(e.pin),
      organization_id: orgId,
    })),
  )
  console.log(`  ✓ ${employees.length} employees`)

  // Employee ↔ Location links
  console.log('   Linking employees to Coors location...')
  await insert(
    'employee_locations',
    employees.map((e) => ({
      employee_id: e.id as string,
      location_id: coorsId,
      is_primary: true,
    })),
  )

  // Employee ↔ Permission Group links
  console.log('   Linking employees to permission groups...')
  await insert(
    'user_permission_groups',
    employeeDefs.map((eDef, i) => ({
      employee_id: employees[i].id as string,
      permission_group_id: groupMap[eDef.group],
    })),
  )
  console.log(`  ✓ Employee assignments complete`)

  // ══════════════════════════════════════════════════════════════════════
  // 12. Sample Products (20)
  // ══════════════════════════════════════════════════════════════════════
  console.log('12. Creating products...')
  const productDefs = [
    // 5 Flower
    { name: 'Blue Dream 1g', cat: 'Flower Pre-Pack', brand: 'Zips', strain: 'Blue Dream', rec: 10, med: 8, thc: 22.5, weight: 1, fe: 1, type: 'weight' },
    { name: 'OG Kush 3.5g', cat: 'Flower Pre-Pack', brand: 'Pecos Valley', strain: 'OG Kush', rec: 30, med: 25, thc: 25.0, weight: 3.5, fe: 3.5, type: 'weight' },
    { name: 'Sour Diesel 7g', cat: 'Flower Pre-Pack', brand: 'Sacred Garden', strain: 'Sour Diesel', rec: 55, med: 45, thc: 23.0, weight: 7, fe: 7, type: 'weight' },
    { name: 'GSC 14g', cat: 'Flower Pre-Pack (OCC)', brand: 'Oasis', strain: 'Girl Scout Cookies', rec: 100, med: 85, thc: 26.0, weight: 14, fe: 14, type: 'weight' },
    { name: 'Northern Lights 28g', cat: 'Flower Pre-Pack', brand: 'INSA', strain: 'Northern Lights', rec: 180, med: 150, thc: 20.0, weight: 28, fe: 28, type: 'weight' },
    // 3 Pre-rolls
    { name: 'Jack Herer Pre-Roll 1g', cat: 'Pre-Rolls', brand: 'Left Coast', strain: 'Jack Herer', rec: 12, med: 10, thc: 21.0, weight: 1, fe: 1, type: 'weight' },
    { name: 'GDP Infused Pre-Roll 1g', cat: 'Infused Pre-Rolls', brand: 'Everest', strain: 'Granddaddy Purple', rec: 18, med: 15, thc: 35.0, weight: 1, fe: 1, type: 'weight' },
    { name: 'Wedding Cake Pre-Roll 0.5g', cat: 'Pre-Rolls (OCC)', brand: 'Oasis', strain: 'Wedding Cake', rec: 7, med: 6, thc: 24.0, weight: 0.5, fe: 0.5, type: 'weight' },
    // 3 Cartridges
    { name: 'Blue Dream Cart 0.5g', cat: 'Carts', brand: 'Kure', strain: 'Blue Dream', rec: 30, med: 25, thc: 85.0, weight: 0.5, fe: 2.5, type: 'quantity' },
    { name: 'Gorilla Glue Cart 1g', cat: 'Carts', brand: 'Nirvana', strain: 'Gorilla Glue', rec: 50, med: 42, thc: 88.0, weight: 1, fe: 5, type: 'quantity' },
    { name: 'Green Crack Disposable 0.3g', cat: 'Disposable Vapes', brand: 'Left Coast', strain: 'Green Crack', rec: 25, med: 20, thc: 82.0, weight: 0.3, fe: 1.5, type: 'quantity' },
    // 3 Edibles
    { name: 'Sour Gummies 100mg', cat: 'Edibles', brand: 'Everest', strain: null, rec: 20, med: 16, thc: null, weight: null, fe: 3.5, type: 'quantity', thc_mg: 100 },
    { name: 'Chocolate Bar 100mg', cat: 'Edibles', brand: 'High Desert Relief', strain: null, rec: 22, med: 18, thc: null, weight: null, fe: 3.5, type: 'quantity', thc_mg: 100 },
    { name: 'RSO Syringe 1g', cat: 'Edibles (RSO)', brand: 'Sacred Garden', strain: 'OG Kush', rec: 40, med: 35, thc: 70.0, weight: 1, fe: 5, type: 'quantity' },
    // 2 Concentrates
    { name: 'Wedding Cake Live Resin 1g', cat: 'Concentrates', brand: 'INSA', strain: 'Wedding Cake', rec: 45, med: 38, thc: 75.0, weight: 1, fe: 5, type: 'weight' },
    { name: 'Sour Diesel Shatter 1g', cat: 'Concentrates (OCC)', brand: 'Oasis', strain: 'Sour Diesel', rec: 40, med: 34, thc: 80.0, weight: 1, fe: 5, type: 'weight' },
    // 2 Accessories (non-cannabis)
    { name: 'Glass Pipe - Spoon', cat: 'Glass - Bongs/Hand Pipes', brand: null, strain: null, rec: 15, med: null, thc: null, weight: null, fe: null, type: 'quantity', cannabis: false },
    { name: 'Battery 510 Thread', cat: 'Accessories - Batteries/Vaporizers', brand: null, strain: null, rec: 20, med: null, thc: null, weight: null, fe: null, type: 'quantity', cannabis: false },
    // 2 Topicals
    { name: 'CBD Pain Cream 500mg', cat: 'Topicals', brand: 'High Desert Relief', strain: null, rec: 35, med: 30, thc: null, weight: null, fe: 2.5, type: 'quantity', cbd_mg: 500 },
    { name: 'THC Muscle Balm 200mg', cat: 'Topicals', brand: 'Kure', strain: null, rec: 28, med: 24, thc: null, weight: null, fe: 2, type: 'quantity', thc_mg: 200 },
  ]

  const products = await insert(
    'products',
    productDefs.map((p) => ({
      organization_id: orgId,
      name: p.name,
      slug: slugify(p.name),
      sku: sku8(),
      category_id: catMap[p.cat],
      brand_id: p.brand ? brandMap[p.brand] : null,
      strain_id: p.strain ? strainMap[p.strain] : null,
      rec_price: p.rec,
      med_price: p.med ?? null,
      is_cannabis: (p as Record<string, unknown>).cannabis !== false,
      is_taxable: true,
      product_type: p.type,
      thc_percentage: p.thc ?? null,
      weight_grams: p.weight ?? null,
      flower_equivalent: p.fe ?? null,
      thc_content_mg: (p as Record<string, unknown>).thc_mg ?? null,
      cbd_content_mg: (p as Record<string, unknown>).cbd_mg ?? null,
      strain_type: p.strain ? strains.find((s) => s.name === p.strain)?.strain_type as string ?? null : null,
    })),
  )
  console.log(`  ✓ ${products.length} products`)

  // ══════════════════════════════════════════════════════════════════════
  // 13. Inventory Items (20 at Coors)
  // ══════════════════════════════════════════════════════════════════════
  console.log('13. Creating inventory items...')
  const inventoryItems = await insert(
    'inventory_items',
    products.map((p) => ({
      product_id: p.id as string,
      location_id: coorsId,
      room_id: coorsSalesFloor.id as string,
      quantity: randomInt(10, 100),
      cost_per_unit: Math.round((p.rec_price as number) * (0.4 + Math.random() * 0.2) * 100) / 100,
      biotrack_barcode: fakeBiotrackBarcode(),
    })),
  )
  console.log(`  ✓ ${inventoryItems.length} inventory items`)

  // ══════════════════════════════════════════════════════════════════════
  // 14. Tax Rates (Coors location)
  // ══════════════════════════════════════════════════════════════════════
  console.log('14. Creating tax rates...')
  const taxRates = await insert('tax_rates', [
    {
      location_id: coorsId,
      name: 'NM Cannabis Excise Tax',
      rate_percent: 0.13,
      is_excise: true,
      applies_to: 'recreational',
      tax_category_id: taxCatMap['Cannabis'],
    },
    {
      location_id: coorsId,
      name: 'Albuquerque GRT',
      rate_percent: 0.079375,
      is_excise: false,
      applies_to: 'both',
      tax_category_id: null, // Applies to both Cannabis and Non-Cannabis
    },
  ])
  console.log(`  ✓ ${taxRates.length} tax rates`)

  // ══════════════════════════════════════════════════════════════════════
  // 15. Loyalty Config
  // ══════════════════════════════════════════════════════════════════════
  console.log('15. Creating loyalty config...')
  await insert('loyalty_config', {
    organization_id: orgId,
    accrual_rate: 1.0,
    initial_signup_reward: 100,
    enrollment_type: 'opt_in',
    redemption_method: 'discount',
    point_expiration_days: 365,
    tiers_enabled: false,
  })
  console.log(`  ✓ Loyalty config created`)

  // ══════════════════════════════════════════════════════════════════════
  // Done!
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n========================')
  console.log('🌱 Seed complete!')
  console.log(`  Organization: ${orgId}`)
  console.log(`  Locations: ${locations.length}`)
  console.log(`  Categories: ${categories.length}`)
  console.log(`  Brands: ${brands.length}`)
  console.log(`  Strains: ${strains.length}`)
  console.log(`  Rooms: ${rooms.length}`)
  console.log(`  Registers: ${registers.length}`)
  console.log(`  Permissions: ${permissions.length}`)
  console.log(`  Permission Groups: ${permGroups.length}`)
  console.log(`  Employees: ${employees.length}`)
  console.log(`  Products: ${products.length}`)
  console.log(`  Inventory Items: ${inventoryItems.length}`)
  console.log(`  Tax Rates: ${taxRates.length}`)
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err)
  process.exit(1)
})
