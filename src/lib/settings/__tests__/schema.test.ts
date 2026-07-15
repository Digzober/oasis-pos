import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_SETTINGS,
  LOCATION_SETTINGS_REGISTRY_PATHS,
  LocationSettingsOverrideSchema,
  OrganizationSettingsOverrideSchema,
} from '../schema'

describe('canonical settings schema', () => {
  it('exports the code defaults for every canonical namespace', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      checkout: { rounding_method: 'none', require_customer: false },
      compliance: { require_id_scan: false },
      printing: {
        auto_print_receipt_default: true,
        auto_print_label_default: false,
      },
      inventory: { low_stock_threshold: 5 },
      online: {
        reserve_inventory: false,
        pickup_window_minutes: 30,
        max_advance_order_days: 1,
      },
    })
  })

  it('rejects unknown canonical and nested keys', () => {
    expect(OrganizationSettingsOverrideSchema.safeParse({ mystery: true }).success).toBe(false)
    expect(OrganizationSettingsOverrideSchema.safeParse({
      checkout: { mystery: true },
    }).success).toBe(false)
    expect(LocationSettingsOverrideSchema.safeParse({
      receipt: { show_location_name: true },
    }).success).toBe(false)
  })

  it('accepts location-only typed configuration parents', () => {
    const parsed = LocationSettingsOverrideSchema.safeParse({
      product_field_config: {
        name: 'required', sku: 'show', barcode: 'show', description: 'show',
        category: 'required', brand: 'show', vendor: 'show', strain: 'show',
        rec_price: 'required', med_price: 'show', cost_price: 'show',
        weight_grams: 'show', thc_percentage: 'show', cbd_percentage: 'show',
        thc_content_mg: 'show', cbd_content_mg: 'show', flower_equivalent: 'show',
        external_category: 'show', regulatory_category: 'show', online_title: 'show',
        online_description: 'show', alternate_name: 'show', producer: 'show', size: 'show',
        flavor: 'show', available_for: 'show', is_taxable: 'show',
        allow_automatic_discounts: 'show', dosage: 'show', net_weight: 'show',
        gross_weight: 'show', unit_thc_dose: 'show', unit_cbd_dose: 'show',
        administration_method: 'show', package_size: 'show', external_sub_category: 'show',
        allergens: 'show', ingredients: 'show', instructions: 'show',
      },
      customer_card_fields: { ready: { customer_name: true, pronouns: false } },
      customer_field_visibility: {
        pos: { phone: 'required', email: 'hide' },
        backend: { address1: 'show', caregiver_phone: 'hide' },
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects removed placeholders and unknown nested customer settings', () => {
    const removedKeys = [
      'enabled_order_types', 'workflow_type', 'default_order_source',
      'restrict_transaction_hours', 'transaction_hours_start',
      'transaction_hours_end', 'badge_priority', 'package_id_formats',
      'default_store_url',
    ]
    for (const key of removedKeys) {
      expect(LocationSettingsOverrideSchema.safeParse({ [key]: true }).success).toBe(false)
    }
    expect(LocationSettingsOverrideSchema.safeParse({
      customer_card_fields: { invented: { customer_name: true } },
    }).success).toBe(false)
    expect(LocationSettingsOverrideSchema.safeParse({
      customer_field_visibility: { prescription: { notes: 'show' } },
    }).success).toBe(false)
    expect(LocationSettingsOverrideSchema.safeParse({
      customer_field_visibility: { pos: { nickname: 'show' } },
    }).success).toBe(false)
  })

  it('rejects every migrated guestlist JSON alias', () => {
    const aliases = [
      'default_status_id', 'preorder_notify_status_id', 'online_pickup_status_id',
      'online_delivery_status_id', 'in_store_order_status_id', 'curbside_status_id',
      'drive_thru_status_id', 'skipped_delivery_status_id',
      'ready_for_delivery_status_id', 'start_delivery_route_status_id',
      'guestlist_default_status_id', 'guestlist_preorder_notify_status_id',
      'guestlist_online_pickup_status_id', 'guestlist_online_delivery_status_id',
      'guestlist_instore_order_status_id', 'guestlist_curbside_status_id',
      'guestlist_drive_thru_status_id', 'guestlist_skipped_delivery_status_id',
      'guestlist_ready_delivery_status_id', 'guestlist_start_route_status_id',
    ]

    for (const alias of aliases) {
      expect(LocationSettingsOverrideSchema.safeParse({ [alias]: null }).success).toBe(false)
    }
  })

  it('keeps the generated location-settings registry in exact schema sync', () => {
    const registry = readFileSync(resolve('LOCATION-SETTINGS-KEYS.md'), 'utf8')
    const manifest = registry.match(/<!-- schema-paths: (.+) -->/)?.[1]

    expect(manifest).toBeDefined()
    expect(JSON.parse(manifest!)).toEqual(LOCATION_SETTINGS_REGISTRY_PATHS)
  })
})
