import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface SmartTagCondition {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains'
  value: string | number
}

interface SmartTagRule {
  id: string
  organization_id: string
  tag_id: string
  name: string
  rules: SmartTagCondition[]
  is_active: boolean
  last_run_at: string | null
}

const ALLOWED_FIELDS = [
  'thc_percentage',
  'cbd_percentage',
  'weight_grams',
  'rec_price',
  'med_price',
  'is_cannabis',
  'category_id',
  'brand_id',
  'strain_type',
  'available_for',
  'product_type',
] as const

const ALLOWED_OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'contains'] as const

type AllowedField = typeof ALLOWED_FIELDS[number]
type AllowedOperator = typeof ALLOWED_OPERATORS[number]

function isValidField(field: string): field is AllowedField {
  return ALLOWED_FIELDS.includes(field as AllowedField)
}

function isValidOperator(op: string): op is AllowedOperator {
  return ALLOWED_OPERATORS.includes(op as AllowedOperator)
}

export function validateConditions(conditions: SmartTagCondition[]): string | null {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return 'At least one condition is required'
  }

  for (let i = 0; i < conditions.length; i++) {
    const c: SmartTagCondition | undefined = conditions[i]
    if (!c || !c.field || !c.operator || c.value === undefined || c.value === null) {
      return `Condition ${i + 1}: field, operator, and value are required`
    }
    if (!isValidField(c.field)) {
      return `Condition ${i + 1}: invalid field "${c.field}"`
    }
    if (!isValidOperator(c.operator)) {
      return `Condition ${i + 1}: invalid operator "${c.operator}"`
    }
    if (c.operator === 'contains' && typeof c.value !== 'string') {
      return `Condition ${i + 1}: "contains" operator requires a string value`
    }
  }

  return null
}

/**
 * Evaluate a smart tag rule and return matching product IDs.
 */
export async function evaluateRule(
  orgId: string,
  rule: SmartTagRule,
): Promise<string[]> {
  const sb = await createSupabaseServerClient()

  let query = sb
    .from('products')
    .select('id')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  for (const condition of rule.rules) {
    query = applyCondition(query, condition)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Smart tag rule evaluation failed', {
      ruleId: rule.id,
      error: error.message,
    })
    throw new Error(`Rule evaluation failed: ${error.message}`)
  }

  return (data ?? []).map((row: { id: string }) => row.id)
}

function applyCondition(
  query: ReturnType<ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>['from']>['select']>,
  condition: SmartTagCondition,
) {
  const { field, operator, value } = condition

  switch (operator) {
    case '=':
      return query.eq(field, value)
    case '!=':
      return query.neq(field, value)
    case '>':
      return query.gt(field, value)
    case '<':
      return query.lt(field, value)
    case '>=':
      return query.gte(field, value)
    case '<=':
      return query.lte(field, value)
    case 'contains':
      return query.ilike(field, `%${value}%`)
    default:
      return query
  }
}

/**
 * Apply a smart tag rule: tag matching products, untag non-matching ones.
 */
export async function applyRule(
  orgId: string,
  ruleId: string,
): Promise<{ tagged: number; untagged: number }> {
  const sb = await createSupabaseServerClient()

  const { data: rule, error: ruleError } = await sb
    .from('smart_tag_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('organization_id', orgId)
    .single()

  if (ruleError || !rule) {
    throw new Error('Smart tag rule not found')
  }

  const matchingIds = await evaluateRule(orgId, rule as unknown as SmartTagRule)

  // Get all products currently tagged with this tag
  const { data: currentlyTagged, error: tagQueryError } = await sb
    .from('product_tags')
    .select('product_id, products!inner(organization_id)')
    .eq('tag_id', rule.tag_id)
    .eq('products.organization_id', orgId)

  if (tagQueryError) {
    logger.error('Failed to query current product tags', {
      ruleId,
      error: tagQueryError.message,
    })
    throw new Error(`Failed to query current tags: ${tagQueryError.message}`)
  }

  const currentTaggedIds = new Set(
    (currentlyTagged ?? []).map((row: { product_id: string }) => row.product_id),
  )
  const matchingSet = new Set(matchingIds)

  // Products to tag (in matching but not currently tagged)
  const toTag = matchingIds.filter((id) => !currentTaggedIds.has(id))

  // Products to untag (currently tagged but not in matching)
  const toUntag = [...currentTaggedIds].filter((id) => !matchingSet.has(id))

  // Insert new tags
  if (toTag.length > 0) {
    const inserts = toTag.map((productId) => ({
      product_id: productId,
      tag_id: rule.tag_id,
    }))

    const { error: insertError } = await sb
      .from('product_tags')
      .upsert(inserts, { onConflict: 'product_id,tag_id' })

    if (insertError) {
      logger.error('Failed to insert product tags', {
        ruleId,
        error: insertError.message,
      })
      throw new Error(`Failed to tag products: ${insertError.message}`)
    }
  }

  // Remove tags from non-matching
  if (toUntag.length > 0) {
    const { error: deleteError } = await sb
      .from('product_tags')
      .delete()
      .eq('tag_id', rule.tag_id)
      .in('product_id', toUntag)

    if (deleteError) {
      logger.error('Failed to remove product tags', {
        ruleId,
        error: deleteError.message,
      })
      throw new Error(`Failed to untag products: ${deleteError.message}`)
    }
  }

  // Update last_run_at
  await sb
    .from('smart_tag_rules')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', ruleId)

  logger.info('Smart tag rule applied', {
    ruleId,
    ruleName: rule.name,
    tagged: toTag.length,
    untagged: toUntag.length,
    totalMatching: matchingIds.length,
  })

  return { tagged: toTag.length, untagged: toUntag.length }
}

/**
 * Run all active smart tag rules for an organization.
 */
export async function runAllRules(
  orgId: string,
): Promise<{ results: Array<{ ruleId: string; name: string; tagged: number; untagged: number; error?: string }> }> {
  const sb = await createSupabaseServerClient()

  const { data: rules, error } = await sb
    .from('smart_tag_rules')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch rules: ${error.message}`)
  }

  const results: Array<{ ruleId: string; name: string; tagged: number; untagged: number; error?: string }> = []

  for (const rule of rules ?? []) {
    try {
      const result = await applyRule(orgId, rule.id)
      results.push({ ruleId: rule.id, name: rule.name, ...result })
    } catch (err) {
      results.push({
        ruleId: rule.id,
        name: rule.name,
        tagged: 0,
        untagged: 0,
        error: String(err),
      })
    }
  }

  return { results }
}
