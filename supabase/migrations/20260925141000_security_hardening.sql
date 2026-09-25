-- Security hardening: personal profiles must be private to their owner.
-- Safe/idempotent migration for environments where public.profiles exists.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';

    -- Remove existing client-facing policies. This prevents broad policies
    -- such as USING (true) from exposing another user's profile.
    EXECUTE (
      SELECT COALESCE(
        string_agg(format('DROP POLICY IF EXISTS %I ON public.profiles;', policyname), E'\n'),
        ''
      )
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
    );

    EXECUTE 'CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id)';

    EXECUTE 'REVOKE ALL ON public.profiles FROM anon';
  END IF;
END
$$;

-- Harden the audit RPC against oversized/unexpected input while retaining
-- the existing explicit action allow-list.
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_entity_title text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_allowed text[] := ARRAY[
    'delete_task','approve_task','revise_task','generate_task',
    'delete_document','delete_conversation','delete_sop',
    'clear_chat','upload_document','export_task'
  ];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_action IS NULL OR NOT (p_action = ANY(v_allowed)) THEN RAISE EXCEPTION 'Invalid action'; END IF;
  IF p_entity_type IS NULL OR length(btrim(p_entity_type)) = 0 OR length(p_entity_type) > 64
     OR p_entity_type !~ '^[A-Za-z0-9_-]+$' THEN RAISE EXCEPTION 'Invalid entity_type'; END IF;
  IF p_entity_id IS NOT NULL AND length(p_entity_id) > 128 THEN RAISE EXCEPTION 'Invalid entity_id'; END IF;
  IF p_entity_title IS NOT NULL AND length(p_entity_title) > 500 THEN RAISE EXCEPTION 'Invalid entity_title'; END IF;
  IF pg_column_size(COALESCE(p_details, '{}'::jsonb)) > 65536 THEN RAISE EXCEPTION 'Details too large'; END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, entity_title, details)
  VALUES (v_uid, p_action, btrim(p_entity_type), p_entity_id, p_entity_title, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb) TO authenticated;
