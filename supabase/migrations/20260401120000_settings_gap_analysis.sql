-- Settings Gap Analysis Migration
-- Fills all gaps from SETTINGS-GAP-ANALYSIS.md

-- ===================
-- HIGH PRIORITY
-- ===================

-- 1. Printers subsystem
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  name TEXT NOT NULL,
  printer_id TEXT,
  printer_type TEXT NOT NULL DEFAULT 'esc_pos'
    CHECK (printer_type IN ('esc_pos', 'zpl', 'brother', 'pdf')),
  computer_name TEXT,
  supports_labels BOOLEAN NOT NULL DEFAULT false,
  supports_receipts BOOLEAN NOT NULL DEFAULT false,
  connection_type TEXT NOT NULL DEFAULT 'network'
    CHECK (connection_type IN ('printnode', 'usb', 'network', 'bluetooth')),
  ip_address TEXT,
  port INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_printers_location ON printers(location_id);
CREATE INDEX IF NOT EXISTS idx_printers_active ON printers(location_id) WHERE is_active = true;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS printer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id UUID NOT NULL REFERENCES registers(id),
  printer_id UUID NOT NULL REFERENCES printers(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('labels', 'receipts')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(register_id, printer_id, assignment_type)
);
CREATE INDEX IF NOT EXISTS idx_printer_assignments_register ON printer_assignments(register_id);
ALTER TABLE printer_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS print_service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) UNIQUE,
  service_type TEXT NOT NULL DEFAULT 'printnode'
    CHECK (service_type IN ('printnode', 'google_cloud_print', 'direct')),
  api_key_encrypted TEXT,
  account_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE print_service_config ENABLE ROW LEVEL SECURITY;

-- 2. BioTrack config
CREATE TABLE IF NOT EXISTS biotrack_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  state_code TEXT NOT NULL DEFAULT 'NM',
  xml_api_url TEXT,
  rest_api_url TEXT,
  username_encrypted TEXT,
  password_encrypted TEXT,
  ubi TEXT,
  use_training_mode BOOLEAN NOT NULL DEFAULT false,
  use_other_plant_material BOOLEAN NOT NULL DEFAULT false,
  use_allotment_check BOOLEAN NOT NULL DEFAULT true,
  report_discounted_prices BOOLEAN NOT NULL DEFAULT false,
  enable_deliveries BOOLEAN NOT NULL DEFAULT false,
  use_lab_data BOOLEAN NOT NULL DEFAULT true,
  default_labs_in_receive BOOLEAN NOT NULL DEFAULT true,
  display_approval_date BOOLEAN NOT NULL DEFAULT false,
  schedule_returns_for_destruction BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE biotrack_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS biotrack_destruction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  biotrack_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  eligible_on DATE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'eligible'
    CHECK (status IN ('eligible', 'ineligible', 'scheduled', 'completed', 'cancelled')),
  destroyed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_biotrack_destruction_location ON biotrack_destruction_queue(location_id);
CREATE INDEX IF NOT EXISTS idx_biotrack_destruction_status ON biotrack_destruction_queue(status) WHERE status IN ('eligible', 'scheduled');
ALTER TABLE biotrack_destruction_queue ENABLE ROW LEVEL SECURITY;

-- 3. Tax rate type + arms length
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS rate_type TEXT NOT NULL DEFAULT 'percentage';
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS flat_amount NUMERIC(12,2);
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS is_arms_length BOOLEAN NOT NULL DEFAULT false;

-- 4. Purchase limit day cycles
ALTER TABLE purchase_limits ADD COLUMN IF NOT EXISTS calendar_days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE purchase_limits ADD COLUMN IF NOT EXISTS cycle_days INTEGER;
ALTER TABLE purchase_limits ADD COLUMN IF NOT EXISTS limit_type TEXT DEFAULT 'calendar';

-- ===================
-- MEDIUM PRIORITY
-- ===================

-- 6. Employee preferences
ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

-- 8. Label image metadata
ALTER TABLE label_images ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE label_images ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES employees(id);

-- ===================
-- LOW PRIORITY
-- ===================

-- 13-15. Time clock enhancements
ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS break_start TIMESTAMPTZ;
ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS break_end TIMESTAMPTZ;
ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS break_minutes NUMERIC(6,2);
ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES employees(id);
ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS edit_reason TEXT;
