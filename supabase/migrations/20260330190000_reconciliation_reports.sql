CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  run_by UUID REFERENCES employees(id),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  items_matched INTEGER NOT NULL DEFAULT 0,
  items_with_discrepancy INTEGER NOT NULL DEFAULT 0,
  items_local_only INTEGER NOT NULL DEFAULT 0,
  items_biotrack_only INTEGER NOT NULL DEFAULT 0,
  auto_resolved INTEGER NOT NULL DEFAULT 0,
  needs_review INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_reports_location ON reconciliation_reports(location_id, run_at DESC);
