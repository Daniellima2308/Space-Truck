UPDATE public.freights
SET amount_received = 0
WHERE amount_received < 0;

ALTER TABLE public.freights
  ALTER COLUMN amount_received SET NOT NULL,
  ALTER COLUMN amount_received SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'freights_amount_received_non_negative'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_amount_received_non_negative
      CHECK (amount_received >= 0);
  END IF;
END
$$;
