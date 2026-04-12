ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS receivable_plan_type text;

UPDATE public.freights
SET receivable_plan_type = 'undefined'
WHERE receivable_mode <> 'off'
  AND receivable_plan_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'freights_receivable_plan_type_check'
      AND n.nspname = 'public'
      AND t.relname = 'freights'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_receivable_plan_type_check
      CHECK (
        receivable_plan_type IS NULL
        OR receivable_plan_type IN ('undefined', 'advance_value', 'advance_percent', 'paid_in_full', 'paid_on_delivery')
      );
  END IF;
END
$$;
