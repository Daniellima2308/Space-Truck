-- ========================
-- BETA ACCESS MODEL
-- ========================
-- Adds role/access status fields to profiles so the app can evolve from
-- a public landing + login screen into a controlled beta gate.
--
-- Important: this migration only prepares the data/security model.
-- Runtime route blocking is intentionally handled in a later frontend PR.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'waitlisted',
  ADD COLUMN IF NOT EXISTS access_status_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_access_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_access_status_check
      CHECK (access_status IN ('waitlisted', 'approved', 'suspended', 'blocked', 'deactivated'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_access_status ON public.profiles (access_status);
CREATE INDEX IF NOT EXISTS idx_profiles_access_lookup ON public.profiles (user_id, role, access_status);

-- Keep every existing non-admin profile behind the beta gate by default.
UPDATE public.profiles
SET
  role = COALESCE(role, 'user'),
  access_status = COALESCE(access_status, 'waitlisted')
WHERE role IS NULL OR access_status IS NULL;

-- Bootstrap Daniel's own account as the initial admin, if the account already exists.
UPDATE public.profiles AS profile
SET
  role = 'admin',
  access_status = 'approved',
  approved_at = COALESCE(profile.approved_at, now()),
  approved_by = COALESCE(profile.approved_by, profile.user_id),
  access_status_reason = COALESCE(profile.access_status_reason, 'initial_admin_bootstrap')
FROM auth.users AS auth_user
WHERE profile.user_id = auth_user.id
  AND lower(auth_user.email) = 'daniellima23082001@gmail.com';

-- Centralized helper for future admin checks in RLS/RPC/Edge Function flows.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND access_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_access_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT access_status
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Users may edit their own profile, but cannot promote themselves or change beta access fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_access_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
    AND (
      NEW.role <> 'user' OR
      NEW.access_status <> 'waitlisted' OR
      NEW.access_status_reason IS NOT NULL OR
      NEW.approved_at IS NOT NULL OR
      NEW.approved_by IS NOT NULL
    )
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND NOT public.is_current_user_admin()
  THEN
    RAISE EXCEPTION 'Only admins can insert profile access fields';
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      NEW.role IS DISTINCT FROM OLD.role OR
      NEW.access_status IS DISTINCT FROM OLD.access_status OR
      NEW.access_status_reason IS DISTINCT FROM OLD.access_status_reason OR
      NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
      NEW.approved_by IS DISTINCT FROM OLD.approved_by
    )
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND NOT public.is_current_user_admin()
  THEN
    RAISE EXCEPTION 'Only admins can update profile access fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_access_self_promotion ON public.profiles;
CREATE TRIGGER prevent_profile_access_self_promotion
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_access_self_promotion();

-- Tighten and extend profile policies without changing domain tables yet.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'user'
    AND access_status = 'waitlisted'
    AND access_status_reason IS NULL
    AND approved_at IS NULL
    AND approved_by IS NULL
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- New signups become waitlisted by default, except the bootstrap admin email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(COALESCE(NEW.email, ''));
  is_bootstrap_admin BOOLEAN := normalized_email = 'daniellima23082001@gmail.com';
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    role,
    access_status,
    approved_at,
    approved_by,
    access_status_reason
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN is_bootstrap_admin THEN 'admin' ELSE 'user' END,
    CASE WHEN is_bootstrap_admin THEN 'approved' ELSE 'waitlisted' END,
    CASE WHEN is_bootstrap_admin THEN now() ELSE NULL END,
    CASE WHEN is_bootstrap_admin THEN NEW.id ELSE NULL END,
    CASE WHEN is_bootstrap_admin THEN 'initial_admin_bootstrap' ELSE 'signup_waitlist' END
  );

  RETURN NEW;
END;
$$;
