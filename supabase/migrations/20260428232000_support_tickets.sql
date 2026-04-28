-- ========================
-- SUPPORT TICKETS TABLE
-- ========================
-- Base unificada para solicitações da Central de Ajuda.
-- Esta migration cria somente a estrutura inicial de tickets.
-- O envio pelo app, chat, WhatsApp real e painel admin entram em PRs separadas.

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT (
    'ST-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 20))
  ),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('support', 'suggestion', 'bug', 'whatsapp_request')),
  category TEXT NOT NULL CHECK (
    category IN (
      'account',
      'trip',
      'freight',
      'fueling',
      'expenses',
      'maintenance',
      'finance',
      'route',
      'other'
    )
  ),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2000),
  preferred_channel TEXT NOT NULL CHECK (preferred_channel IN ('app', 'email', 'whatsapp')),
  contact_email TEXT CHECK (
    contact_email IS NULL OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  whatsapp_phone TEXT CHECK (
    whatsapp_phone IS NULL
    OR (
      whatsapp_phone ~ '^\+?[0-9 ()-]{10,24}$'
      AND char_length(regexp_replace(whatsapp_phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 13
    )
  ),
  whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'waiting_contact', 'answered', 'closed')
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source TEXT NOT NULL DEFAULT 'app_help_center' CHECK (char_length(btrim(source)) BETWEEN 1 AND 80),
  app_version TEXT CHECK (app_version IS NULL OR char_length(btrim(app_version)) <= 40),
  device_info JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(device_info) = 'object'),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT support_tickets_whatsapp_contact_required CHECK (
    preferred_channel <> 'whatsapp'
    OR (whatsapp_phone IS NOT NULL AND whatsapp_consent = true)
  ),
  CONSTRAINT support_tickets_closed_at_status_consistency CHECK (
    (status = 'closed' AND closed_at IS NOT NULL)
    OR (status <> 'closed' AND closed_at IS NULL)
  )
);

CREATE INDEX support_tickets_user_created_at_idx
  ON public.support_tickets (user_id, created_at DESC);

CREATE INDEX support_tickets_user_status_idx
  ON public.support_tickets (user_id, status);

CREATE INDEX support_tickets_status_created_at_idx
  ON public.support_tickets (status, created_at DESC);

CREATE INDEX support_tickets_category_created_at_idx
  ON public.support_tickets (category, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_support_ticket_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' THEN
    NEW.closed_at = COALESCE(NEW.closed_at, now());
  ELSE
    NEW.closed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_support_ticket_closed_at
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_support_ticket_closed_at();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
