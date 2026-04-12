ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS receivable_plan_type text;

UPDATE public.freights
SET receivable_plan_type = 'undefined'
WHERE receivable_mode <> 'off'
  AND receivable_plan_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'freights_receivable_plan_type_check'
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
