-- Preserve the discount builder's reward target instead of silently dropping it.
ALTER TABLE public.discount_rewards
  ADD COLUMN IF NOT EXISTS apply_to TEXT;

UPDATE public.discount_rewards
SET apply_to = 'each_item'
WHERE apply_to IS NULL;

ALTER TABLE public.discount_rewards
  ALTER COLUMN apply_to SET DEFAULT 'each_item',
  ALTER COLUMN apply_to SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.discount_rewards'::regclass
      AND conname = 'discount_rewards_apply_to_check'
  ) THEN
    ALTER TABLE public.discount_rewards
      ADD CONSTRAINT discount_rewards_apply_to_check
      CHECK (apply_to IN ('each_item', 'cheapest', 'most_expensive', 'cart_total'));
  END IF;
END
$$;
