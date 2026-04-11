ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS receivable_mode text NOT NULL DEFAULT 'off';

UPDATE public.freights
SET receivable_mode = 'complete'
WHERE receivable_mode IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'freights_receivable_mode_check'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_receivable_mode_check
      CHECK (receivable_mode IN ('off', 'basic', 'complete'));
  END IF;
END
$$;
