ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS advance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS delivery_proof_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS balance_release_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS balance_adjustments jsonb NOT NULL DEFAULT '[]'::jsonb;