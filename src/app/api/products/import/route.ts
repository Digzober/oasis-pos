import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const MAX_ROWS = 500

interface ImportResult {
  imported: number
  updated: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }

    if (ch === ',') {
      current.push(field)
      field = ''
      i++
      continue
    }

    if (ch === '\r') {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i++
      }
      current.push(field)
      field = ''
      rows.push(current)
      current = []
      i++
      continue
    }

    if (ch === '\n') {
      current.push(field)
      field = ''
      rows.push(current)
      current = []
      i++
      continue
    }

    field += ch
    i++
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  return rows
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined
  const lower = value.toLowerCase().trim()
  if (lower === 'true' || lower === '1' || lower === 'yes') return true
  if (lower === 'false' || lower === '0' || lower === 'no') return false
  return undefined
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null
  const num = Number(value.trim())
  if (isNaN(num)) return null
  return num
}

interface LookupCaches {
  categories: Map<string, string>
  brands: Map<string, string>
  vendors: Map<string, string>
  strains: Map<string, string>
}

async function buildLookupCaches(
  sb: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<LookupCaches> {
  const [catRes, brandRes, vendorRes, strainRes] = await Promise.all([
    sb.from('product_categories').select('id, name'),
    sb.from('brands').select('id, name'),
    sb.from('vendors').select('id, name'),
    sb.from('strains').select('id, name'),
  ])

  const toMap = (rows: Array<{ id: string; name: string }> | null): Map<string, string> => {
    const map = new Map<string, string>()
    for (const row of rows ?? []) {
      map.set(row.name.toLowerCase().trim(), row.id)
    }
    return map
  }

  return {
    categories: toMap(catRes.data),
    brands: toMap(brandRes.data),
    vendors: toMap(vendorRes.data),
    strains: toMap(strainRes.data),
  }
}

function lookupId(cache: Map<string, string>, name: string | undefined): string | null {
  if (!name || name.trim() === '') return null
  return cache.get(name.toLowerCase().trim()) ?? null
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data with a file field' },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file field in form data' },
        { status: 400 },
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 },
      )
    }

    const text = await file.text()
    const allRows = parseCsv(text)

    if (allRows.length < 2) {
      return NextResponse.json(
        { error: 'CSV must contain a header row and at least one data row' },
        { status: 400 },
      )
    }

    const headerRow = (allRows[0] as string[]).map(h => h.toLowerCase().trim())
    const dataRows = allRows.slice(1).filter(row => row.some(cell => cell.trim() !== '')) as string[][]

    if (dataRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `CSV contains ${dataRows.length} rows. Maximum is ${MAX_ROWS} rows per import.` },
        { status: 400 },
      )
    }

    const colIndex = (colName: string): number => headerRow.indexOf(colName)

    const nameIdx = colIndex('name')
    if (nameIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must contain a "name" column' },
        { status: 400 },
      )
    }

    const sb = await createSupabaseServerClient()
    const caches = await buildLookupCaches(sb)

    const getValue = (row: string[], col: string): string | undefined => {
      const idx = colIndex(col)
      if (idx === -1 || idx >= row.length) return undefined
      const cell = row[idx]
      return cell !== undefined ? cell.trim() : undefined
    }

    const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] }

    for (const [i, row] of dataRows.entries()) {
      const rowNum = i + 2

      try {
        const name = getValue(row, 'name')
        if (!name) {
          result.skipped++
          result.errors.push({ row: rowNum, error: 'Missing required field: name' })
          continue
        }

        const sku = getValue(row, 'sku') || null
        const categoryName = getValue(row, 'category')
        const brandName = getValue(row, 'brand')
        const vendorName = getValue(row, 'vendor')
        const strainName = getValue(row, 'strain')

        const categoryId = lookupId(caches.categories, categoryName)
        const brandId = lookupId(caches.brands, brandName)
        const vendorId = lookupId(caches.vendors, vendorName)
        const strainId = lookupId(caches.strains, strainName)

        const recPrice = parseNumber(getValue(row, 'rec_price'))
        const medPrice = parseNumber(getValue(row, 'med_price'))
        const costPrice = parseNumber(getValue(row, 'cost_price'))
        const isCannabis = parseBoolean(getValue(row, 'is_cannabis'))
        const productType = getValue(row, 'product_type') || null
        const weightGrams = parseNumber(getValue(row, 'weight_grams'))
        const thcPercentage = parseNumber(getValue(row, 'thc_percentage'))
        const cbdPercentage = parseNumber(getValue(row, 'cbd_percentage'))
        const thcContentMg = parseNumber(getValue(row, 'thc_content_mg'))
        const cbdContentMg = parseNumber(getValue(row, 'cbd_content_mg'))
        const flowerEquivalent = parseNumber(getValue(row, 'flower_equivalent'))
        const description = getValue(row, 'description') || null
        const onlineTitle = getValue(row, 'online_title') || null
        const onlineDescription = getValue(row, 'online_description') || null
        const regulatoryCategory = getValue(row, 'regulatory_category') || null
        const externalCategory = getValue(row, 'external_category') || null
        const isOnSale = parseBoolean(getValue(row, 'is_on_sale'))
        const isActive = parseBoolean(getValue(row, 'is_active'))
        const barcode = getValue(row, 'barcode') || null

        const productData: Record<string, unknown> = {
          name,
          organization_id: session.organizationId,
        }

        if (sku !== null) productData.sku = sku
        if (barcode !== null) productData.barcode = barcode
        if (categoryId !== null) productData.category_id = categoryId
        if (brandId !== null) productData.brand_id = brandId
        if (vendorId !== null) productData.vendor_id = vendorId
        if (strainId !== null) productData.strain_id = strainId
        if (recPrice !== null) productData.rec_price = recPrice
        if (medPrice !== null) productData.med_price = medPrice
        if (costPrice !== null) productData.cost_price = costPrice
        if (isCannabis !== undefined) productData.is_cannabis = isCannabis
        if (productType !== null) productData.product_type = productType
        if (weightGrams !== null) productData.weight_grams = weightGrams
        if (thcPercentage !== null) productData.thc_percentage = thcPercentage
        if (cbdPercentage !== null) productData.cbd_percentage = cbdPercentage
        if (thcContentMg !== null) productData.thc_content_mg = thcContentMg
        if (cbdContentMg !== null) productData.cbd_content_mg = cbdContentMg
        if (flowerEquivalent !== null) productData.flower_equivalent = flowerEquivalent
        if (description !== null) productData.description = description
        if (onlineTitle !== null) productData.online_title = onlineTitle
        if (onlineDescription !== null) productData.online_description = onlineDescription
        if (regulatoryCategory !== null) productData.regulatory_category = regulatoryCategory
        if (externalCategory !== null) productData.external_category = externalCategory
        if (isOnSale !== undefined) productData.is_on_sale = isOnSale
        if (isActive !== undefined) productData.is_active = isActive

        let isUpdate = false

        if (sku) {
          const { data: existing } = await sb
            .from('products')
            .select('id')
            .eq('sku', sku)
            .eq('organization_id', session.organizationId)
            .maybeSingle()

          if (existing) {
            isUpdate = true
            const { organization_id: _orgId, ...updateData } = productData
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await sb
              .from('products')
              .update(updateData as any)
              .eq('id', existing.id)

            if (updateError) {
              result.errors.push({ row: rowNum, error: `Update failed: ${updateError.message}` })
              result.skipped++
              continue
            }

            result.updated++
          }
        }

        if (!isUpdate) {
          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

          productData.slug = slug

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await sb
            .from('products')
            .insert(productData as any)

          if (insertError) {
            result.errors.push({ row: rowNum, error: `Insert failed: ${insertError.message}` })
            result.skipped++
            continue
          }

          result.imported++
        }
      } catch (rowErr) {
        result.errors.push({ row: rowNum, error: `Unexpected error: ${String(rowErr)}` })
        result.skipped++
      }
    }

    logger.info('Product CSV import completed', {
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      errorCount: result.errors.length,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product import error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
