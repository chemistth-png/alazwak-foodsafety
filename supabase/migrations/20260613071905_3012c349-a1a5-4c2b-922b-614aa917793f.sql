
-- Restrict company_sops writes to admins only (read remains open to authenticated users).
-- Currently any authenticated user can insert/update/delete because no write policies exist
-- and the existing ALL policy grants too much. Remove and replace.

-- Create app_role enum + user_roles + has_role helper if not present
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Reset company_sops policies and add proper read + admin-only write rules
DROP POLICY IF EXISTS "Allow full access to company_sops" ON public.company_sops;
DROP POLICY IF EXISTS "Authenticated can read company_sops" ON public.company_sops;
DROP POLICY IF EXISTS "Admins can insert company_sops" ON public.company_sops;
DROP POLICY IF EXISTS "Admins can update company_sops" ON public.company_sops;
DROP POLICY IF EXISTS "Admins can delete company_sops" ON public.company_sops;

CREATE POLICY "Authenticated can read company_sops"
  ON public.company_sops FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert company_sops"
  ON public.company_sops FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company_sops"
  ON public.company_sops FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete company_sops"
  ON public.company_sops FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add explicit UPDATE policy on chat-files storage bucket (own folder only)
DROP POLICY IF EXISTS "Users can update their own chat files" ON storage.objects;
CREATE POLICY "Users can update their own chat files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
