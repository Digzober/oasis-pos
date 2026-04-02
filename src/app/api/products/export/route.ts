import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const EXPORT_SELECT = `
  name, sku, barcode, description, online_title, online_description,
  rec_price, med_price, cost_price,
  is_cannabis, product_type, weight_grams,
  thc_percentage, cbd_percentage, thc_content_mg, cbd_content_mg,
  flower_equivalent, regulatory_category, external_category,
  is_on_sale, is_active,
  product_categories ( name ),
  brands ( name ),
  vendors ( name ),
  strains ( name, strain_type )
`

const CSV_COLUMNS = [
  'name', 'sku', 'barcode', 'category', 'brand', 'vendor', 'strain', 'strain_type',
  'rec_price', 'med_price', 'cost_price', 'is_cannabis', 'product_type', 'weight_grams',
  'thc_percentage', 'cbd_percentage', 'thc_content_mg', 'cbd_content_mg',
  'flower_equivalent', 'description', 'online_title', 'online_description',
  'regulatory_category', 'external_category', 'is_on_sale', 'is_active',
] as const

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',')
}

interface ProductRow {
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  online_title: string | null
  online_description: string | null
  rec_price: number | null
  med_price: number | null
  cost_price: number | null
  is_cannabis: boolean
  product_type: string | null
  weight_grams: number | null
  thc_percentage: number | null
  cbd_percentage: number | null
  thc_content_mg: number | null
  cbd_content_mg: number | null
  flower_equivalent: number | null
  regulatory_category: string | null
  external_category: string | null
  is_on_sale: boolean
  is_active: boolean
  product_categories: { name: string } | null
  brands: { name: string } | null
  vendors: { name: string } | null
  strains: { name: string; strain_type: string | null } | null
}

function productToCsvValues(row: ProductRow): string[] {
  return [
    row.name,
    row.sku ?? '',
    row.barcode ?? '',
    row.product_categories?.name ?? '',
    row.brands?.name ?? '',
    row.vendors?.name ?? '',
    row.strains?.name ?? '',
    row.strains?.strain_type ?? '',
    row.rec_price != null ? String(row.rec_price) : '',
    row.med_price != null ? String(row.med_price) : '',
    row.cost_price != null ? String(row.cost_price) : '',
    String(row.is_cannabis),
    row.product_type ?? '',
    row.weight_grams != null ? String(row.weight_grams) : '',
    row.thc_percentage != null ? String(row.thc_percentage) : '',
    row.cbd_percentage != null ? String(row.cbd_percentage) : '',
    row.thc_content_mg != null ? String(row.thc_content_mg) : '',
    row.cbd_content_mg != null ? String(row.cbd_content_mg) : '',
    row.flower_equivalent != null ? String(row.flower_equivalent) : '',
    row.description ?? '',
    row.online_title ?? '',
    row.online_description ?? '',
    row.regulatory_category ?? '',
    row.external_category ?? '',
    String(row.is_on_sale),
    String(row.is_active),
  ]
}

export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const params = request.nextUrl.searchParams
    const search = params.get('search') ?? undefined
    const categoryId = params.get('categoryId') ?? undefined
    const brandId = params.get('brandId') ?? undefined
    const vendorId = params.get('vendorId') ?? undefined
    const isActiveParam = params.get('isActive')
    const isCannabisParam = params.get('isCannabis')

    const sb = await createSupabaseServerClient()

    let query = sb
      .from('products')
      .select(EXPORT_SELECT)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,online_title.ilike.%${search}%`)
    }
    if (categoryId) query = query.eq('category_id', categoryId)
    if (brandId) query = query.eq('brand_id', brandId)
    if (vendorId) query = query.eq('vendor_id', vendorId)
    if (isActiveParam !== null) query = query.eq('is_active', isActiveParam === 'true')
    if (isCannabisParam !== null) query = query.eq('is_cannabis', isCannabisParam === 'true')

    query = query.order('name', { ascending: true })

    const { data: products, error } = await query

    if (error) {
      logger.error('Product export query failed', { error: error.message })
      return new Response(JSON.stringify({ error: 'Failed to fetch products for export' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rows = (products ?? []) as unknown as ProductRow[]
    const lines: string[] = [buildCsvRow([...CSV_COLUMNS])]

    for (const row of rows) {
      lines.push(buildCsvRow(productToCsvValues(row)))
    }

    const csv = lines.join('\r\n') + '\r\n'
    const dateStr = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=products-export-${dateStr}.csv`,
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    logger.error('Product export error', { error: String(err) })
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
