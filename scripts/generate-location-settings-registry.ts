import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  CANONICAL_SETTING_PATHS,
  DEFAULT_SETTINGS,
  LOCATION_SETTINGS_REGISTRY_PATHS,
} from '../src/lib/settings/schema'

function getDefault(path: string): boolean | number | string {
  const [namespace, key] = path.split('.') as [keyof typeof DEFAULT_SETTINGS, string]
  const values = DEFAULT_SETTINGS[namespace] as unknown as Record<string, boolean | number | string>
  return values[key]!
}

function displayType(value: unknown): string {
  return typeof value === 'number' ? 'integer' : typeof value
}

function ancillaryType(path: string): string {
  if (path.endsWith('_status_id')) return 'UUID | empty string | null'
  if (path.startsWith('product_field_config.')) return 'required | show | hide'
  const types: Record<string, string> = {
    customer_card_fields: 'object', customer_field_visibility: 'object',
  }
  return types[path] ?? 'unknown'
}

function table(rows: string[][], headings: string[]): string {
  const header = `| ${headings.join(' | ')} |`
  const divider = `| ${headings.map(() => '---').join(' | ')} |`
  return [header, divider, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n')
}

function buildRegistry(): string {
  const canonical = new Set<string>(CANONICAL_SETTING_PATHS)
  const canonicalRows = CANONICAL_SETTING_PATHS.map((path) => {
    const value = getDefault(path)
    return [`\`${path}\``, displayType(value), `\`${JSON.stringify(value)}\``, 'Organization + location override']
  })
  const locationRows = LOCATION_SETTINGS_REGISTRY_PATHS
    .filter((path) => !canonical.has(path) && !path.startsWith('product_field_config.'))
    .map((path) => [`\`${path}\``, ancillaryType(path), 'Location only'])
  const productRows = LOCATION_SETTINGS_REGISTRY_PATHS
    .filter((path) => path.startsWith('product_field_config.'))
    .map((path) => [`\`${path}\``, ancillaryType(path)])
  return [
    '# Location Settings JSONB Key Registry',
    '',
    '> Generated from `src/lib/settings/schema.ts` by `npx tsx scripts/generate-location-settings-registry.ts`. Do not edit by hand.',
    '',
    `<!-- schema-paths: ${JSON.stringify(LOCATION_SETTINGS_REGISTRY_PATHS)} -->`,
    '',
    'Unknown keys are rejected by the atomic settings writers. Canonical values resolve in this order: location override, organization default, code default.',
    '',
    '## Canonical settings', '', table(canonicalRows, ['Path', 'Type', 'Code default', 'Scope']),
    '', '## Location-only configuration', '', table(locationRows, ['Path', 'Type', 'Scope']),
    '', '## Product field configuration', '',
    'Every product field is required when the `product_field_config` object is present.', '',
    table(productRows, ['Path', 'Allowed values']), '',
  ].join('\n')
}

async function main(): Promise<void> {
  await writeFile(resolve('LOCATION-SETTINGS-KEYS.md'), buildRegistry(), 'utf8')
}

void main()
