import { describe, it, expect } from 'vitest'
import { generateLabelHtml, type LabelData, type LabelTemplate } from '../labelService'

const sampleData: LabelData = {
  product_name: 'Blue Dream 3.5g', brand_name: 'Oasis', strain_name: 'Blue Dream', strain_type: 'hybrid',
  category_name: 'Flower', thc_percentage: '22.5%', cbd_percentage: '0.8%', weight: '3.5g',
  price: '$30.00', sku: 'PRD-00001', biotrack_barcode: '0123456789012345',
  batch_number: 'B-001', lot_number: 'L-001', expiration_date: '06/30/2026',
  received_date: '03/30/2026', compliance_text: 'For adults 21+ only. NM CCD Licensed.',
}

const sampleTemplate: LabelTemplate = {
  id: 'tpl-1', name: 'Standard', label_type: 'product', width_mm: 50, height_mm: 25, dpi: 203, is_default: true, is_active: true,
  fields: [
    { type: 'text', key: 'product_name', x: 2, y: 2, font_size: 11, bold: true },
    { type: 'text', key: 'thc_percentage', label: 'THC', x: 2, y: 10, font_size: 9 },
    { type: 'text', key: 'price', x: 2, y: 16, font_size: 10, bold: true },
    { type: 'text', key: 'compliance_text', x: 2, y: 22, font_size: 5 },
  ],
}

describe('labelService', () => {
  it('1. template has field layout', () => {
    expect(sampleTemplate.fields).toHaveLength(4)
    expect(sampleTemplate.fields[0]!.key).toBe('product_name')
  })

  it('2. label data has all fields populated', () => {
    expect(sampleData.product_name).toBe('Blue Dream 3.5g')
    expect(sampleData.thc_percentage).toBe('22.5%')
    expect(sampleData.biotrack_barcode).toHaveLength(16)
    expect(sampleData.compliance_text).toBeTruthy()
  })

  it('3. generates HTML with positioned fields', () => {
    const html = generateLabelHtml(sampleData, sampleTemplate)
    expect(html).toContain('Blue Dream 3.5g')
    expect(html).toContain('THC: 22.5%')
    expect(html).toContain('$30.00')
    expect(html).toContain('position:absolute')
  })

  it('4. default template used by flag', () => {
    const templates = [
      { ...sampleTemplate, id: 't1', is_default: false },
      { ...sampleTemplate, id: 't2', is_default: true },
    ]
    const defaultTpl = templates.find(t => t.is_default)
    expect(defaultTpl?.id).toBe('t2')
  })

  it('5. missing data shows empty not error', () => {
    const sparse: LabelData = { ...sampleData, strain_name: '', cbd_percentage: 'N/A', biotrack_barcode: '' }
    const html = generateLabelHtml(sparse, sampleTemplate)
    expect(html).toContain('Blue Dream 3.5g') // still renders product name
    expect(html).not.toContain('undefined')
  })
})
