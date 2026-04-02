import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface ProductMatch {
  product_id: string
  product_name: string
  confidence: number
  match_method: 'barcode' | 'exact_name' | 'fuzzy_name' | 'brand_strain' | 'manual'
}

const MAX_RESULTS = 5

/**
 * BioTrack category names mapped to our product_categories master_category values.
 * BioTrack sends generic category strings; we map them to our taxonomy.
 */
const BIOTRACK_CATEGORY_MAP: Record<string, string[]> = {
  'Usable Marijuana': ['flower'],
  'Flower': ['flower'],
  'Buds': ['flower'],
  'Shake/Trim': ['flower'],
  'Concentrate': ['concentrates'],
  'Concentrates': ['concentrates'],
  'Extract': ['concentrates'],
  'Edible': ['edibles'],
  'Edibles': ['edibles'],
  'Infused': ['edibles', 'topicals'],
  'Topical': ['topicals'],
  'Topicals': ['topicals'],
  'Tincture': ['tinctures'],
  'Tinctures': ['tinctures'],
  'Capsule': ['capsules'],
  'Capsules': ['capsules'],
  'Pre-Roll': ['pre_rolls'],
  'Pre-Rolls': ['pre_rolls'],
  'Preroll': ['pre_rolls'],
  'Cartridge': ['vaporizers'],
  'Vape': ['vaporizers'],
  'Vaporizer': ['vaporizers'],
  'Accessory': ['accessories'],
  'Accessories': ['accessories'],
  'Other': ['other'],
}

/** Filler words removed during normalization */
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'for', 'with', 'in', 'by',
  'qty', 'pk', 'pack', 'ct', 'count', 'ea', 'each',
])

/** Regex patterns stripped during name normalization */
const WEIGHT_PATTERN = /\b\d+(\.\d+)?\s*(g|mg|oz|ml|lb|kg|gram|grams|milligram|milligrams)\b\.?/gi
const QUANTITY_SUFFIX_PATTERN = /\b\d+\s*(qty|pk|pack|ct|count|ea|each)\b/gi
const PARENTHETICAL_PATTERN = /\([^)]*\)/g
const DASH_QUANTITY_PATTERN = /\s*-\s*\d+\s*(g|mg|qty|pk|pack|ct)\b\.?/gi
const MULTI_SPACE_PATTERN = /\s+/g

/**
 * Normalize a product name for fuzzy comparison.
 * Strips weights, quantities, parenthetical suffixes, filler words,
 * and normalizes whitespace and casing.
 */
function normalizeName(raw: string): string {
  let name = raw.toLowerCase()
  name = name.replace(WEIGHT_PATTERN, ' ')
  name = name.replace(QUANTITY_SUFFIX_PATTERN, ' ')
  name = name.replace(DASH_QUANTITY_PATTERN, ' ')
  name = name.replace(PARENTHETICAL_PATTERN, ' ')
  name = name.replace(/[^a-z0-9\s]/g, ' ')

  const tokens = name.split(MULTI_SPACE_PATTERN).filter(Boolean)
  const filtered = tokens.filter((t) => !FILLER_WORDS.has(t))
  return filtered.join(' ').trim()
}

/**
 * Tokenize a string into a set of lowercase alphanumeric tokens,
 * excluding filler words.
 */
function tokenize(text: string): Set<string> {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const tokens = lower.split(MULTI_SPACE_PATTERN).filter(Boolean)
  return new Set(tokens.filter((t) => !FILLER_WORDS.has(t) && t.length > 1))
}

/**
 * Compute Jaccard similarity between two token sets.
 * Returns a value between 0 and 1.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Parse a BioTrack product name to extract a likely brand (first segment
 * before a dash or known delimiter) and strain name.
 * Example: "Cuatro - 1g. - Key Lime Pie (H) - 5 qty"
 *   → brand: "cuatro", strain: "key lime pie"
 */
function parseBrandAndStrain(biotrackName: string): { brand: string; strain: string } {
  const segments = biotrackName.split(/\s*-\s*/).map((s) => s.trim()).filter(Boolean)

  let brand = ''
  let strain = ''

  if (segments.length >= 1 && segments[0] !== undefined) {
    brand = segments[0].toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  }

  // The strain is typically the segment that is NOT a weight, quantity, or
  // parenthetical indicator. Walk segments looking for the longest
  // non-numeric, non-weight segment after the brand.
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i] ?? ''
    const isWeight = /^\d+(\.\d+)?\s*(g|mg|oz|ml)\b/i.test(seg)
    const isQuantity = /^\d+\s*(qty|pk|pack|ct|count|ea)\b/i.test(seg)
    if (!isWeight && !isQuantity) {
      const cleaned = seg.replace(PARENTHETICAL_PATTERN, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase()
      if (cleaned.length > strain.length) {
        strain = cleaned
      }
    }
  }

  return { brand, strain }
}

/**
 * Match a BioTrack manifest item to local catalog products.
 *
 * Strategy (priority order):
 * 1. Barcode match → confidence 1.0
 * 2. Exact name match → confidence 1.0
 * 3. Normalized name match → confidence 0.9
 * 4. Brand + Strain match → confidence 0.8
 * 5. Token overlap (Jaccard similarity) → top 5
 * 6. Category fallback → confidence 0.3
 *
 * Returns up to 5 matches sorted by confidence descending.
 */
export async function matchBioTrackItem(
  biotrackName: string,
  biotrackBarcode: string,
  biotrackCategory: string,
  organizationId: string
): Promise<ProductMatch[]> {
  const sb = await createSupabaseServerClient()
  const matches: Map<string, ProductMatch> = new Map()

  // ------------------------------------------------------------------
  // 1. Barcode match
  // ------------------------------------------------------------------
  if (biotrackBarcode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invItems, error: barcodeErr } = await (sb.from('inventory_items') as any)
      .select('product_id, products!inner(id, name)')
      .eq('biotrack_barcode', biotrackBarcode)
      .eq('products.organization_id', organizationId)
      .limit(1)

    if (barcodeErr) {
      logger.warn('Barcode lookup failed', { error: barcodeErr.message, barcode: biotrackBarcode })
    }

    if (invItems && invItems.length > 0) {
      const product = invItems[0].products
      if (product) {
        matches.set(product.id, {
          product_id: product.id,
          product_name: product.name,
          confidence: 1.0,
          match_method: 'barcode',
        })
      }
    }
  }

  if (matches.size >= MAX_RESULTS) {
    return Array.from(matches.values()).slice(0, MAX_RESULTS)
  }

  // ------------------------------------------------------------------
  // 2. Exact name match
  // ------------------------------------------------------------------
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exactProducts, error: exactErr } = await (sb.from('products') as any)
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .ilike('name', biotrackName.trim())
      .limit(MAX_RESULTS)

    if (exactErr) {
      logger.warn('Exact name match failed', { error: exactErr.message })
    }

    if (exactProducts) {
      for (const p of exactProducts) {
        if (!matches.has(p.id)) {
          matches.set(p.id, {
            product_id: p.id,
            product_name: p.name,
            confidence: 1.0,
            match_method: 'exact_name',
          })
        }
      }
    }
  }

  if (matches.size >= MAX_RESULTS) {
    return sortAndLimit(matches)
  }

  // ------------------------------------------------------------------
  // Load all active products for fuzzy matching stages (3-6)
  // ------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allProducts, error: productsErr } = await (sb.from('products') as any)
    .select('id, name, brand_id, strain_id, category_id, brands(name), strains(name), product_categories(master_category)')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(2000)

  if (productsErr) {
    logger.error('Failed to load products for matching', { error: productsErr.message })
    return sortAndLimit(matches)
  }

  if (!allProducts || allProducts.length === 0) {
    return sortAndLimit(matches)
  }

  // ------------------------------------------------------------------
  // 3. Normalized name match
  // ------------------------------------------------------------------
  const normalizedInput = normalizeName(biotrackName)

  if (normalizedInput.length > 0) {
    for (const p of allProducts) {
      if (matches.has(p.id)) continue
      const normalizedProduct = normalizeName(p.name)
      if (normalizedProduct === normalizedInput) {
        matches.set(p.id, {
          product_id: p.id,
          product_name: p.name,
          confidence: 0.9,
          match_method: 'fuzzy_name',
        })
      }
    }
  }

  if (matches.size >= MAX_RESULTS) {
    return sortAndLimit(matches)
  }

  // ------------------------------------------------------------------
  // 4. Brand + Strain match
  // ------------------------------------------------------------------
  const { brand: parsedBrand, strain: parsedStrain } = parseBrandAndStrain(biotrackName)

  if (parsedBrand || parsedStrain) {
    for (const p of allProducts) {
      if (matches.has(p.id)) continue

      const productBrand = (p.brands?.name ?? '').toLowerCase()
      const productStrain = (p.strains?.name ?? '').toLowerCase()

      const brandMatch = parsedBrand.length > 0 && productBrand.length > 0 &&
        (productBrand.includes(parsedBrand) || parsedBrand.includes(productBrand))
      const strainMatch = parsedStrain.length > 0 && productStrain.length > 0 &&
        (productStrain.includes(parsedStrain) || parsedStrain.includes(productStrain))

      if (brandMatch && strainMatch) {
        matches.set(p.id, {
          product_id: p.id,
          product_name: p.name,
          confidence: 0.8,
          match_method: 'brand_strain',
        })
      }
    }
  }

  if (matches.size >= MAX_RESULTS) {
    return sortAndLimit(matches)
  }

  // ------------------------------------------------------------------
  // 5. Token overlap (Jaccard similarity)
  // ------------------------------------------------------------------
  const inputTokens = tokenize(biotrackName)

  if (inputTokens.size > 0) {
    const scored: Array<{ product: typeof allProducts[0]; score: number }> = []

    for (const p of allProducts) {
      if (matches.has(p.id)) continue
      const productTokens = tokenize(p.name)
      const similarity = jaccardSimilarity(inputTokens, productTokens)
      if (similarity > 0.1) {
        scored.push({ product: p, score: similarity })
      }
    }

    scored.sort((a, b) => b.score - a.score)

    const slotsAvailable = MAX_RESULTS - matches.size
    for (let i = 0; i < Math.min(scored.length, slotsAvailable); i++) {
      const entry = scored[i]
      if (!entry) continue
      const { product, score } = entry
      matches.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        confidence: Math.round(score * 100) / 100,
        match_method: 'fuzzy_name',
      })
    }
  }

  if (matches.size >= MAX_RESULTS) {
    return sortAndLimit(matches)
  }

  // ------------------------------------------------------------------
  // 6. Category fallback
  // ------------------------------------------------------------------
  const mappedCategories = BIOTRACK_CATEGORY_MAP[biotrackCategory] ?? []

  if (mappedCategories.length > 0 && matches.size < MAX_RESULTS) {
    const slotsAvailable = MAX_RESULTS - matches.size
    let added = 0

    for (const p of allProducts) {
      if (added >= slotsAvailable) break
      if (matches.has(p.id)) continue

      const masterCategory = p.product_categories?.master_category ?? ''
      if (mappedCategories.includes(masterCategory)) {
        matches.set(p.id, {
          product_id: p.id,
          product_name: p.name,
          confidence: 0.3,
          match_method: 'fuzzy_name',
        })
        added++
      }
    }
  }

  return sortAndLimit(matches)
}

function sortAndLimit(matches: Map<string, ProductMatch>): ProductMatch[] {
  return Array.from(matches.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_RESULTS)
}
