-- Security regression guardrails.
-- Fail the migration if known dangerous cross-user policies or legacy caller-scoped RAG RPCs still exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','telegram_users','telegram_messages','telegram_settings')
      AND roles @> ARRAY['authenticated']::name[]
      AND (qual = 'true' OR with_check = 'true')
  ) THEN
    RAISE EXCEPTION 'Security regression: broad authenticated policy remains on sensitive table';
  END IF;

  IF to_regprocedure('public.search_documents(uuid,text,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'Security regression: caller-scoped search_documents still exists';
  END IF;

  IF to_regprocedure('public.search_document_chunks(uuid,text,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'Security regression: caller-scoped search_document_chunks still exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'match_document_chunks'
      AND pg_get_function_identity_arguments(p.oid) ILIKE '%p_user_id%'
  ) THEN
    RAISE EXCEPTION 'Security regression: caller-scoped match_document_chunks still exists';
  END IF;
END
$$;
