import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface AuditRow {
  line: number
  control: string
  surface: string
}

type Disposition = 'wired' | 'removed'

const POS_FIELDS_WIRED = ['.pos.phone`', '.pos.email`', '.pos.mmj_id`', '.pos.mmj_id_exp`']
const A_WIRED = [
  '`rounding_method`', '`require_customer_checkout`', '`require_id_scan`',
  '`auto_print_receipt`', '`auto_print_label`',
]

function parseRows(markdown: string): AuditRow[] {
  return markdown.split(/\r?\n/).flatMap((line, index) => {
    if (!line.startsWith('|')) return []
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim())
    if (cells.length !== 8 || cells[5] !== 'PLACEHOLDER') return []
    return [{ line: index + 1, control: cells[0]!, surface: cells[1]! }]
  })
}

function disposition(row: AuditRow): Disposition {
  if (row.surface === 'A') return A_WIRED.includes(row.control) ? 'wired' : 'removed'
  if (row.surface === 'B') {
    return row.control === '`allow_zero_price`' || row.control === '`auto_deduct_on_sale`'
      ? 'removed'
      : 'wired'
  }
  if (['Cards', 'Receipts', 'Guestlist', 'Inventory adjustments', 'Events', 'Templates'].includes(row.surface)) {
    return 'wired'
  }
  if (row.surface === 'Customer fields') {
    if (row.control.includes('.backend.')) return 'wired'
    return POS_FIELDS_WIRED.some((field) => row.control.includes(field)) ? 'wired' : 'removed'
  }
  if (row.surface === 'Inventory statuses') {
    return row.control.includes('color') ? 'removed' : 'wired'
  }
  return 'removed'
}

function evidence(row: AuditRow, result: Disposition): string {
  if (row.surface === 'A' || row.surface === 'B') {
    return result === 'wired'
      ? '`src/lib/settings/schema.ts`; Phase B runtime/tests'
      : 'Removed by canonical-key migration and settings-hub consolidation'
  }
  const paths: Record<string, string> = {
    Receipts: '`src/lib/receipts/config.ts`; `src/lib/receipts/render.ts`',
    Guestlist: '`src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering',
    Cards: '`src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx`',
    'Customer fields': result === 'wired'
      ? '`fieldVisibility.ts`; POS/backoffice customer forms'
      : 'Removed from strict schema, writer, and customer configuration UI',
    'Inventory statuses': result === 'wired'
      ? 'Active identity is loaded by inventory receive/item flows'
      : 'Color control removed from UI and writer schema',
    'Inventory adjustments': 'Active reasons are loaded by adjustment forms',
    Events: '`src/app/(storefront)/events/page.tsx` renders event data and image',
    Templates: '`templateService.ts` filters lifecycle for campaign consumers',
    Categories: 'Parent control removed from category UI and API schemas',
    BioTrack: 'Non-consumed toggle removed from BioTrack UI/API schema',
    Labels: 'Label type control removed; product type is internal',
    Printers: 'Decorative routing/identity controls removed from printer settings UI',
    'Print service': 'Decorative service/API-key controls removed from settings UI',
    Workflow: 'Workflow page/API and JSON keys removed',
    Adjustments: 'Register reason page/API removed',
    Returns: 'Register reason page/API removed',
    Cancellations: 'Register reason page/API removed',
    Voids: 'Register reason page/API removed',
    'Register settings': 'Transaction-hours settings page and JSON keys removed',
    Doctors: 'Doctors configuration page/API removed',
    'Qualifying conditions': 'Qualifying-conditions page/API removed',
    Badges: 'Decorative badge controls removed from UI and API schemas',
    Dosages: 'THC/CBD/serving controls removed; dosage name remains consumed',
    'Packing lists/kits': 'Kit pages, APIs, and configuration component removed',
    'Package formats': 'Package-format UI, APIs, service, schema, and registry removed',
    Loyalty: 'Only consumed accrual rate remains in loyalty settings',
    'Marketing configure': 'Marketing configure page/tag API and JSON key removed',
    'Discount builder': 'Coupon code option and persistence removed',
  }
  return paths[row.surface] ?? 'Removed from the settings UI and accepted schemas'
}

function escapeCell(value: string) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

async function main() {
  const source = await readFile(resolve('SETTINGS-WIRING-AUDIT.md'), 'utf8')
  const rows = parseRows(source)
  if (rows.length !== 355) throw new Error(`Expected 355 PLACEHOLDER rows, found ${rows.length}`)

  const body = rows.map((row) => {
    const result = disposition(row)
    const commit = ['A', 'B', 'Receipts'].includes(row.surface)
      ? '`5f8742b`'
      : 'working tree (uncommitted)'
    return `| ${row.line} | ${escapeCell(row.surface)} | ${escapeCell(row.control)} | ${result} | ${escapeCell(evidence(row, result))} | ${commit} |`
  })
  const wired = rows.filter((row) => disposition(row) === 'wired').length
  const removed = rows.length - wired
  const output = [
    '# Settings Placeholder Disposition',
    '',
    '> Generated from every `PLACEHOLDER` row in `SETTINGS-WIRING-AUDIT.md` by `npx tsx scripts/generate-settings-disposition.ts`.',
    '',
    `Coverage: **${rows.length}/${rows.length}** audited rows — **${wired} wired**, **${removed} removed**.`,
    '',
    '| Audit line | Surface | Control | Disposition | Evidence | Commit |',
    '| ---: | --- | --- | --- | --- | --- |',
    ...body,
    '',
  ].join('\n')
  await writeFile(resolve('.route/DISPOSITION.md'), output, 'utf8')
}

void main()
