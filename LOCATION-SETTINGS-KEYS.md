# Location Settings JSONB Key Registry

> Generated from `src/lib/settings/schema.ts` by `npx tsx scripts/generate-location-settings-registry.ts`. Do not edit by hand.

<!-- schema-paths: ["checkout.require_customer","checkout.rounding_method","compliance.require_id_scan","customer_card_fields","customer_field_visibility","inventory.low_stock_threshold","online.max_advance_order_days","online.pickup_window_minutes","online.reserve_inventory","printing.auto_print_label_default","printing.auto_print_receipt_default","product_field_config.administration_method","product_field_config.allergens","product_field_config.allow_automatic_discounts","product_field_config.alternate_name","product_field_config.available_for","product_field_config.barcode","product_field_config.brand","product_field_config.category","product_field_config.cbd_content_mg","product_field_config.cbd_percentage","product_field_config.cost_price","product_field_config.description","product_field_config.dosage","product_field_config.external_category","product_field_config.external_sub_category","product_field_config.flavor","product_field_config.flower_equivalent","product_field_config.gross_weight","product_field_config.ingredients","product_field_config.instructions","product_field_config.is_taxable","product_field_config.med_price","product_field_config.name","product_field_config.net_weight","product_field_config.online_description","product_field_config.online_title","product_field_config.package_size","product_field_config.producer","product_field_config.rec_price","product_field_config.regulatory_category","product_field_config.size","product_field_config.sku","product_field_config.strain","product_field_config.thc_content_mg","product_field_config.thc_percentage","product_field_config.unit_cbd_dose","product_field_config.unit_thc_dose","product_field_config.vendor","product_field_config.weight_grams"] -->

Unknown keys are rejected by the atomic settings writers. Canonical values resolve in this order: location override, organization default, code default.

## Canonical settings

| Path | Type | Code default | Scope |
| --- | --- | --- | --- |
| `checkout.rounding_method` | string | `"none"` | Organization + location override |
| `checkout.require_customer` | boolean | `false` | Organization + location override |
| `compliance.require_id_scan` | boolean | `false` | Organization + location override |
| `printing.auto_print_receipt_default` | boolean | `true` | Organization + location override |
| `printing.auto_print_label_default` | boolean | `false` | Organization + location override |
| `inventory.low_stock_threshold` | integer | `5` | Organization + location override |
| `online.reserve_inventory` | boolean | `false` | Organization + location override |
| `online.pickup_window_minutes` | integer | `30` | Organization + location override |
| `online.max_advance_order_days` | integer | `1` | Organization + location override |

## Location-only configuration

| Path | Type | Scope |
| --- | --- | --- |
| `customer_card_fields` | object | Location only |
| `customer_field_visibility` | object | Location only |

## Product field configuration

Every product field is required when the `product_field_config` object is present.

| Path | Allowed values |
| --- | --- |
| `product_field_config.administration_method` | required | show | hide |
| `product_field_config.allergens` | required | show | hide |
| `product_field_config.allow_automatic_discounts` | required | show | hide |
| `product_field_config.alternate_name` | required | show | hide |
| `product_field_config.available_for` | required | show | hide |
| `product_field_config.barcode` | required | show | hide |
| `product_field_config.brand` | required | show | hide |
| `product_field_config.category` | required | show | hide |
| `product_field_config.cbd_content_mg` | required | show | hide |
| `product_field_config.cbd_percentage` | required | show | hide |
| `product_field_config.cost_price` | required | show | hide |
| `product_field_config.description` | required | show | hide |
| `product_field_config.dosage` | required | show | hide |
| `product_field_config.external_category` | required | show | hide |
| `product_field_config.external_sub_category` | required | show | hide |
| `product_field_config.flavor` | required | show | hide |
| `product_field_config.flower_equivalent` | required | show | hide |
| `product_field_config.gross_weight` | required | show | hide |
| `product_field_config.ingredients` | required | show | hide |
| `product_field_config.instructions` | required | show | hide |
| `product_field_config.is_taxable` | required | show | hide |
| `product_field_config.med_price` | required | show | hide |
| `product_field_config.name` | required | show | hide |
| `product_field_config.net_weight` | required | show | hide |
| `product_field_config.online_description` | required | show | hide |
| `product_field_config.online_title` | required | show | hide |
| `product_field_config.package_size` | required | show | hide |
| `product_field_config.producer` | required | show | hide |
| `product_field_config.rec_price` | required | show | hide |
| `product_field_config.regulatory_category` | required | show | hide |
| `product_field_config.size` | required | show | hide |
| `product_field_config.sku` | required | show | hide |
| `product_field_config.strain` | required | show | hide |
| `product_field_config.thc_content_mg` | required | show | hide |
| `product_field_config.thc_percentage` | required | show | hide |
| `product_field_config.unit_cbd_dose` | required | show | hide |
| `product_field_config.unit_thc_dose` | required | show | hide |
| `product_field_config.vendor` | required | show | hide |
| `product_field_config.weight_grams` | required | show | hide |
