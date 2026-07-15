-- Organization defaults are intentionally separate from per-location overrides.
-- Both JSON documents are written only through the atomic patch functions below.
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_settings_object_check CHECK (jsonb_typeof(settings) = 'object')
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organization_settings FROM anon, authenticated;
GRANT ALL ON TABLE public.organization_settings TO service_role;

CREATE OR REPLACE FUNCTION public.set_organization_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_organization_settings_updated_at
  ON public.organization_settings;
CREATE TRIGGER set_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW EXECUTE FUNCTION public.set_organization_settings_updated_at();

-- Recursively merges objects. JSON null is a deletion marker, which makes a
-- per-control "inherit" operation atomic without a stale read/merge/upsert.
CREATE OR REPLACE FUNCTION public.jsonb_deep_patch(
  p_target JSONB,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_result JSONB := COALESCE(p_target, '{}'::jsonb);
  v_key TEXT;
  v_value JSONB;
BEGIN
  IF jsonb_typeof(v_result) <> 'object'
     OR jsonb_typeof(COALESCE(p_patch, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Settings target and patch must be JSON objects';
  END IF;

  FOR v_key, v_value IN
    SELECT key, value FROM jsonb_each(COALESCE(p_patch, '{}'::jsonb))
  LOOP
    IF v_value = 'null'::jsonb THEN
      v_result := v_result - v_key;
    ELSIF jsonb_typeof(v_value) = 'object'
          AND jsonb_typeof(v_result -> v_key) = 'object' THEN
      v_result := jsonb_set(
        v_result,
        ARRAY[v_key],
        public.jsonb_deep_patch(v_result -> v_key, v_value),
        true
      );
    ELSE
      v_result := jsonb_set(v_result, ARRAY[v_key], v_value, true);
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.patch_location_settings(
  p_location_id UUID,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.location_settings (location_id, settings, updated_at)
  VALUES (
    p_location_id,
    public.jsonb_deep_patch('{}'::jsonb, p_patch),
    now()
  )
  ON CONFLICT (location_id) DO UPDATE
  SET settings = public.jsonb_deep_patch(
        public.location_settings.settings,
        p_patch
      ),
      updated_at = now()
  RETURNING settings;
$$;

CREATE OR REPLACE FUNCTION public.patch_organization_settings(
  p_organization_id UUID,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO public.organization_settings (organization_id, settings, updated_at)
  VALUES (
    p_organization_id,
    public.jsonb_deep_patch('{}'::jsonb, p_patch),
    now()
  )
  ON CONFLICT (organization_id) DO UPDATE
  SET settings = public.jsonb_deep_patch(
        public.organization_settings.settings,
        p_patch
      ),
      updated_at = now()
  RETURNING settings;
$$;

REVOKE ALL ON FUNCTION public.jsonb_deep_patch(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.patch_location_settings(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.patch_organization_settings(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_deep_patch(JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.patch_location_settings(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.patch_organization_settings(UUID, JSONB) TO service_role;
