ALTER TABLE public.freights
  ADD COLUMN IF NOT EXISTS payment_due_date date,
  ADD COLUMN IF NOT EXISTS amount_received numeric NOT NULL DEFAULT 0;
