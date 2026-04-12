ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS receivable_scheme text;

UPDATE public.freights
SET receivable_scheme = 'not_defined'
WHERE receivable_scheme IS NULL;

ALTER TABLE public.freights
  ALTER COLUMN receivable_scheme SET DEFAULT 'not_defined';

ALTER TABLE public.freights
  ALTER COLUMN receivable_scheme SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'freights_receivable_scheme_check'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_receivable_scheme_check
      CHECK (receivable_scheme IN ('not_defined', 'value', 'percentage', 'full', 'delivery'));
  END IF;
END
$$;
