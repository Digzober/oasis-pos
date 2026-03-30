import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export interface LabelField {
  type: 'text' | 'barcode' | 'image'
  key: string
  label?: string
  x: number
  y: number
  font_size?: number
  bold?: boolean
  width?: number
  height?: number
  format?: string
}

export interface LabelTemplate {
  id: string
  name: string
  label_type: string
  width_mm: number
  height_mm: number
  dpi: number
  fields: LabelField[]
  is_default: boolean
  is_active: boolean
}

export interface LabelData {
  product_name: string
  brand_name: string
  strain_name: string
  strain_type: string
  category_name: string
  thc_percentage: string
  cbd_percentage: string
  weight: string
  price: string
  sku: string
  biotrack_barcode: string
  batch_number: string
  lot_number: string
  expiration_date: string
  compliance_text: string
  received_date: string
}

export async function listTemplates(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('label_templates').select('*').eq('organization_id', orgId).eq('is_active', true).order('name')
  return (data ?? []).map(mapTemplate)
}

export async function getTemplate(id: string) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('label_templates').select('*').eq('id', id).single()
  if (error || !data) throw new AppError('NOT_FOUND', 'Template not found', error, 404)
  return mapTemplate(data)
}

export async function createTemplate(input: { organization_id: string; name: string; label_type: string; width_mm: number; height_mm: number; dpi?: number; fields: LabelField[] }) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('label_templates') as any).insert({
    organization_id: input.organization_id,
    name: input.name,
    label_type: input.label_type,
    width_mm: input.width_mm,
    height_mm: input.height_mm,
    dpi: input.dpi ?? 203,
    fields: input.fields,
  }).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return mapTemplate(data)
}

export async function updateTemplate(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('label_templates') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return mapTemplate(data)
}

export async function generateLabelData(inventoryItemId: string): Promise<LabelData> {
  const sb = await createSupabaseServerClient()

  const { data: inv } = await sb
    .from('inventory_items')
    .select('*, products ( name, sku, rec_price, weight_grams, thc_percentage, cbd_percentage, brands ( name ), strains ( name, strain_type ), product_categories ( name ) )')
    .eq('id', inventoryItemId)
    .single()

  if (!inv) throw new AppError('NOT_FOUND', 'Inventory item not found', undefined, 404)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = inv.products as any

  return {
    product_name: p?.name ?? 'Unknown Product',
    brand_name: p?.brands?.name ?? '',
    strain_name: p?.strains?.name ?? '',
    strain_type: p?.strains?.strain_type ?? '',
    category_name: p?.product_categories?.name ?? '',
    thc_percentage: p?.thc_percentage != null ? `${p.thc_percentage}%` : 'N/A',
    cbd_percentage: p?.cbd_percentage != null ? `${p.cbd_percentage}%` : 'N/A',
    weight: p?.weight_grams != null ? `${p.weight_grams}g` : '',
    price: p?.rec_price != null ? `$${Number(p.rec_price).toFixed(2)}` : '',
    sku: p?.sku ?? '',
    biotrack_barcode: inv.biotrack_barcode ?? '',
    batch_number: inv.batch_id ?? '',
    lot_number: inv.lot_number ?? '',
    expiration_date: inv.expiration_date ? new Date(inv.expiration_date).toLocaleDateString() : '',
    received_date: inv.received_at ? new Date(inv.received_at).toLocaleDateString() : '',
    compliance_text: 'For use only by adults 21 and older. Keep out of reach of children. Not for resale. NM CCD Licensed.',
  }
}

export function generateLabelHtml(data: LabelData, template: LabelTemplate): string {
  const mmToPx = (mm: number) => Math.round(mm * 3.78) // ~96 DPI screen
  const w = mmToPx(template.width_mm)
  const h = mmToPx(template.height_mm)

  const fieldHtml = template.fields.map((field) => {
    const value = data[field.key as keyof LabelData] ?? ''
    const style = `position:absolute;left:${mmToPx(field.x)}px;top:${mmToPx(field.y)}px;font-size:${field.font_size ?? 10}px;${field.bold ? 'font-weight:bold;' : ''}`

    if (field.type === 'barcode') {
      if (!value) return ''
      return `<div style="${style}"><svg id="barcode-${field.key}"></svg><div style="font-size:8px;text-align:center;margin-top:2px">${value}</div></div>`
    }

    if (field.type === 'image') {
      return `<div style="${style};width:${mmToPx(field.width ?? 20)}px;height:${mmToPx(field.height ?? 20)}px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">Logo</div>`
    }

    const prefix = field.label ? `${field.label}: ` : ''
    return `<div style="${style};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${w - mmToPx(field.x) - 4}px">${prefix}${value}</div>`
  }).join('\n')

  return `<div style="position:relative;width:${w}px;height:${h}px;border:1px solid #ccc;background:white;font-family:Arial,sans-serif;overflow:hidden;padding:0;box-sizing:border-box">${fieldHtml}</div>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplate(row: any): LabelTemplate {
  return {
    id: row.id,
    name: row.name,
    label_type: row.label_type ?? 'product',
    width_mm: row.width_mm ?? 50,
    height_mm: row.height_mm ?? 25,
    dpi: row.dpi ?? 203,
    fields: (row.fields as LabelField[]) ?? [],
    is_default: row.is_default ?? false,
    is_active: row.is_active ?? true,
  }
}
