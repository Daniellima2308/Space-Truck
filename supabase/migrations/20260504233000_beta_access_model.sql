-- ========================
-- BETA ACCESS MODEL
-- ========================
-- Adds role/access status fields to profiles so the app can evolve from
-- a public landing + login screen into a controlled beta gate.
--
-- Important: this migration only prepares the data/security model.
-- Runtime route blocking is intentionally handled in a later frontend PR.
--
-- Bootstrap admin configuration:
-- Set app.bootstrap_admin_email outside git before applying this migration if
-- the initial admin should be promoted automatically during migration/signup.
-- Example, run manually in the target database with the real admin email:
--   ALTER DATABASE postgres SET app.bootstrap_admin_email = '<admin-email>';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'waitlisted',
  ADD COLUMN IF NOT EXISTS access_status_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_otp_channel TEXT NOT NULL DEFAULT 'none',
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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_preferred_otp_channel_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_otp_channel_check
      CHECK (preferred_otp_channel IN ('none', 'email', 'whatsapp'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_access_status ON public.profiles (access_status);
CREATE INDEX IF NOT EXISTS idx_profiles_access_lookup ON public.profiles (user_id, role, access_status);

-- Existing profiles receive the column defaults above. In the beta flow, every
-- non-admin profile remains waitlisted until explicitly approved by an admin.

-- Bootstrap the initial admin account if app.bootstrap_admin_email is configured
-- in the target database and the account already exists.
DO $$
DECLARE
  bootstrap_admin_email TEXT := lower(NULLIF(current_setting('app.bootstrap_admin_email', true), ''));
BEGIN
  IF bootstrap_admin_email IS NOT NULL THEN
    UPDATE public.profiles AS profile
    SET
      role = 'admin',
      access_status = 'approved',
      approved_at = COALESCE(profile.approved_at, now()),
      approved_by = COALESCE(profile.approved_by, profile.user_id),
      access_status_reason = COALESCE(profile.access_status_reason, 'initial_admin_bootstrap')
    FROM auth.users AS auth_user
    WHERE profile.user_id = auth_user.id
      AND lower(auth_user.email) = bootstrap_admin_email;
  END IF;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_current_user_access_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT access_status
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;

-- Users may edit their own profile, but cannot promote themselves or change
-- admin-controlled beta access fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_access_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND auth.uid() IS NOT NULL
    AND auth.role() IS DISTINCT FROM 'service_role'
    AND NOT public.is_current_user_admin()
    AND (
      NEW.role IS DISTINCT FROM OLD.role OR
      NEW.access_status IS DISTINCT FROM OLD.access_status OR
      NEW.access_status_reason IS DISTINCT FROM OLD.access_status_reason OR
      NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
      NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
      NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
    )
  THEN
    RAISE EXCEPTION 'Only admins can update profile access fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_access_self_promotion ON public.profiles;
CREATE TRIGGER prevent_profile_access_self_promotion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_access_self_promotion();

-- Tighten and extend profile policies without changing domain tables yet.
-- Profile creation should come from the auth.users trigger, not direct client inserts.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

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

-- New signups become waitlisted by default, except when the target database has
-- app.bootstrap_admin_email configured with the signup email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(COALESCE(NEW.email, ''));
  bootstrap_admin_email TEXT := lower(NULLIF(current_setting('app.bootstrap_admin_email', true), ''));
  is_bootstrap_admin BOOLEAN := bootstrap_admin_email IS NOT NULL
    AND normalized_email = bootstrap_admin_email;
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
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
