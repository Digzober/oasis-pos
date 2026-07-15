-- Canonical guestlist workflow mappings. The ten event names come directly
-- from the approved register-configure guestlist controls. Default selection
-- remains authoritative on guestlist_statuses.is_default.
CREATE TABLE IF NOT EXISTS public.guestlist_workflow_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  workflow_event TEXT NOT NULL,
  status_id UUID NOT NULL REFERENCES public.guestlist_statuses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guestlist_workflow_mappings_workflow_event_check CHECK (workflow_event IN ('default', 'preorder_notify', 'online_pickup', 'online_delivery', 'in_store_order', 'curbside', 'drive_thru', 'skipped_delivery', 'ready_for_delivery', 'start_delivery_route')),
  CONSTRAINT guestlist_workflow_mappings_location_event_key UNIQUE (location_id, workflow_event)
);

ALTER TABLE public.guestlist_workflow_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guestlist_workflow_mappings FROM anon, authenticated;
GRANT ALL ON TABLE public.guestlist_workflow_mappings TO service_role;

CREATE OR REPLACE FUNCTION public.set_guestlist_workflow_mapping_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_guestlist_workflow_mapping_updated_at
  ON public.guestlist_workflow_mappings;
CREATE TRIGGER set_guestlist_workflow_mapping_updated_at
BEFORE UPDATE ON public.guestlist_workflow_mappings
FOR EACH ROW EXECUTE FUNCTION public.set_guestlist_workflow_mapping_updated_at();

-- The actively written UI aliases win over the unexposed registry aliases.
-- Only valid status IDs owned by the same location are migrated.
WITH candidates AS (
  SELECT
    settings.location_id,
    aliases.workflow_event,
    COALESCE(NULLIF(aliases.ui_status_id, ''), NULLIF(aliases.registry_status_id, '')) AS status_id
  FROM public.location_settings AS settings
  CROSS JOIN LATERAL (VALUES
    ('preorder_notify', settings.settings ->> 'preorder_notify_status_id', settings.settings ->> 'guestlist_preorder_notify_status_id'),
    ('online_pickup', settings.settings ->> 'online_pickup_status_id', settings.settings ->> 'guestlist_online_pickup_status_id'),
    ('online_delivery', settings.settings ->> 'online_delivery_status_id', settings.settings ->> 'guestlist_online_delivery_status_id'),
    ('in_store_order', settings.settings ->> 'in_store_order_status_id', settings.settings ->> 'guestlist_instore_order_status_id'),
    ('curbside', settings.settings ->> 'curbside_status_id', settings.settings ->> 'guestlist_curbside_status_id'),
    ('drive_thru', settings.settings ->> 'drive_thru_status_id', settings.settings ->> 'guestlist_drive_thru_status_id'),
    ('skipped_delivery', settings.settings ->> 'skipped_delivery_status_id', settings.settings ->> 'guestlist_skipped_delivery_status_id'),
    ('ready_for_delivery', settings.settings ->> 'ready_for_delivery_status_id', settings.settings ->> 'guestlist_ready_delivery_status_id'),
    ('start_delivery_route', settings.settings ->> 'start_delivery_route_status_id', settings.settings ->> 'guestlist_start_route_status_id')
  ) AS aliases(workflow_event, ui_status_id, registry_status_id)
)
INSERT INTO public.guestlist_workflow_mappings (location_id, workflow_event, status_id)
SELECT candidates.location_id, candidates.workflow_event, statuses.id
FROM candidates
JOIN public.guestlist_statuses AS statuses
  ON statuses.id::TEXT = candidates.status_id
 AND statuses.location_id = candidates.location_id
WHERE candidates.status_id IS NOT NULL
ON CONFLICT (location_id, workflow_event) DO UPDATE
SET status_id = EXCLUDED.status_id,
    updated_at = now();

-- Preserve default-status authority on the status row while migrating the
-- non-null UI alias first and its registry counterpart only as a fallback.
WITH candidates AS (
  SELECT
    settings.location_id,
    COALESCE(
      NULLIF(settings.settings ->> 'default_status_id', ''),
      NULLIF(settings.settings ->> 'guestlist_default_status_id', '')
    ) AS status_id
  FROM public.location_settings AS settings
), valid_defaults AS (
  SELECT candidates.location_id, statuses.id AS status_id
  FROM candidates
  JOIN public.guestlist_statuses AS statuses
    ON statuses.id::TEXT = candidates.status_id
   AND statuses.location_id = candidates.location_id
  WHERE candidates.status_id IS NOT NULL
)
UPDATE public.guestlist_statuses AS statuses
SET is_default = statuses.id = valid_defaults.status_id,
    updated_at = now()
FROM valid_defaults
WHERE statuses.location_id = valid_defaults.location_id;

-- Atomic, key-level patching prevents unrelated workflow events from being
-- overwritten by a stale register-configure tab.
CREATE OR REPLACE FUNCTION public.patch_guestlist_workflow_mappings(
  p_location_id UUID,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_event TEXT;
  v_value JSONB;
  v_status_id UUID;
  v_updated INTEGER;
  v_result JSONB;
BEGIN
  IF jsonb_typeof(COALESCE(p_patch, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Guestlist workflow patch must be a JSON object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(p_patch, '{}'::jsonb)) AS entry(key)
    WHERE entry.key <> ALL (ARRAY['default', 'preorder_notify', 'online_pickup', 'online_delivery', 'in_store_order', 'curbside', 'drive_thru', 'skipped_delivery', 'ready_for_delivery', 'start_delivery_route'])
  ) THEN
    RAISE EXCEPTION 'Unknown guestlist workflow event';
  END IF;

  FOR v_event, v_value IN
    SELECT key, value FROM jsonb_each(COALESCE(p_patch, '{}'::jsonb))
  LOOP
    IF v_value <> 'null'::jsonb AND jsonb_typeof(v_value) <> 'string' THEN
      RAISE EXCEPTION 'Guestlist workflow status IDs must be UUID strings or null';
    END IF;

    v_status_id := CASE WHEN v_value = 'null'::jsonb
      THEN NULL ELSE (v_value #>> '{}')::UUID END;

    IF v_status_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.guestlist_statuses
      WHERE id = v_status_id AND location_id = p_location_id
    ) THEN
      RAISE EXCEPTION 'Guestlist status does not belong to the location';
    END IF;

    IF v_event = 'default' THEN
      UPDATE public.guestlist_statuses
      SET is_default = false, updated_at = now()
      WHERE location_id = p_location_id AND is_default;

      IF v_status_id IS NOT NULL THEN
        UPDATE public.guestlist_statuses
        SET is_default = true, updated_at = now()
        WHERE id = v_status_id AND location_id = p_location_id;
        GET DIAGNOSTICS v_updated = ROW_COUNT;
        IF v_updated <> 1 THEN RAISE EXCEPTION 'Default guestlist status not found'; END IF;
      END IF;
    ELSIF v_status_id IS NULL THEN
      DELETE FROM public.guestlist_workflow_mappings
      WHERE location_id = p_location_id AND workflow_event = v_event;
    ELSE
      INSERT INTO public.guestlist_workflow_mappings (location_id, workflow_event, status_id)
      VALUES (p_location_id, v_event, v_status_id)
      ON CONFLICT (location_id, workflow_event) DO UPDATE
      SET status_id = EXCLUDED.status_id, updated_at = now();
    END IF;
  END LOOP;

  SELECT COALESCE(jsonb_object_agg(workflow_event, status_id), '{}'::jsonb)
  INTO v_result
  FROM public.guestlist_workflow_mappings
  WHERE location_id = p_location_id AND workflow_event <> 'default';

  RETURN v_result || jsonb_build_object(
    'default', (
      SELECT id FROM public.guestlist_statuses
      WHERE location_id = p_location_id AND is_default
      ORDER BY sort_order, id LIMIT 1
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.patch_guestlist_workflow_mappings(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patch_guestlist_workflow_mappings(UUID, JSONB)
  TO service_role;

-- The typed table and guestlist_statuses.is_default are now the only stores.
UPDATE public.location_settings
SET settings = settings
  - 'default_status_id'
  - 'preorder_notify_status_id'
  - 'online_pickup_status_id'
  - 'online_delivery_status_id'
  - 'in_store_order_status_id'
  - 'curbside_status_id'
  - 'drive_thru_status_id'
  - 'skipped_delivery_status_id'
  - 'ready_for_delivery_status_id'
  - 'start_delivery_route_status_id'
  - 'guestlist_default_status_id'
  - 'guestlist_preorder_notify_status_id'
  - 'guestlist_online_pickup_status_id'
  - 'guestlist_online_delivery_status_id'
  - 'guestlist_instore_order_status_id'
  - 'guestlist_curbside_status_id'
  - 'guestlist_drive_thru_status_id'
  - 'guestlist_skipped_delivery_status_id'
  - 'guestlist_ready_delivery_status_id'
  - 'guestlist_start_route_status_id',
    updated_at = now();

UPDATE public.organization_settings
SET settings = settings
  - 'default_status_id'
  - 'preorder_notify_status_id'
  - 'online_pickup_status_id'
  - 'online_delivery_status_id'
  - 'in_store_order_status_id'
  - 'curbside_status_id'
  - 'drive_thru_status_id'
  - 'skipped_delivery_status_id'
  - 'ready_for_delivery_status_id'
  - 'start_delivery_route_status_id'
  - 'guestlist_default_status_id'
  - 'guestlist_preorder_notify_status_id'
  - 'guestlist_online_pickup_status_id'
  - 'guestlist_online_delivery_status_id'
  - 'guestlist_instore_order_status_id'
  - 'guestlist_curbside_status_id'
  - 'guestlist_drive_thru_status_id'
  - 'guestlist_skipped_delivery_status_id'
  - 'guestlist_ready_delivery_status_id'
  - 'guestlist_start_route_status_id',
    updated_at = now();
