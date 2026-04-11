ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS advance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS delivery_proof_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS balance_release_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS balance_adjustments jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.freights
SET
  advance_amount = 0,
  delivery_proof_status = 'not_required',
  balance_release_mode = 'none',
  balance_adjustments = '[]'::jsonb
WHERE
  advance_amount IS NULL
  OR delivery_proof_status IS NULL
  OR balance_release_mode IS NULL
  OR balance_adjustments IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'freights_advance_amount_non_negative'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_advance_amount_non_negative
      CHECK (advance_amount >= 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'freights_delivery_proof_status_check'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_delivery_proof_status_check
      CHECK (delivery_proof_status IN ('not_required', 'pending_send', 'sent', 'confirmed'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'freights_balance_release_mode_check'
  ) THEN
    ALTER TABLE public.freights
      ADD CONSTRAINT freights_balance_release_mode_check
      CHECK (balance_release_mode IN ('none', 'proof_photo', 'physical_proof', 'agreed_deadline', 'direct_delivery'));
  END IF;
END
$$;
