
-- 1. Adicionar coluna nullable sem default
ALTER TABLE public.freights
ADD COLUMN IF NOT EXISTS receivable_mode text;

-- 2. Preencher registros antigos com 'complete'
UPDATE public.freights
SET receivable_mode = 'complete'
WHERE receivable_mode IS NULL;

-- 3. Definir default 'off'
ALTER TABLE public.freights
ALTER COLUMN receivable_mode SET DEFAULT 'off';

-- 4. Definir NOT NULL
ALTER TABLE public.freights
ALTER COLUMN receivable_mode SET NOT NULL;

-- 5. Check constraint
ALTER TABLE public.freights
ADD CONSTRAINT chk_receivable_mode
CHECK (receivable_mode IN ('off', 'basic', 'complete'));
