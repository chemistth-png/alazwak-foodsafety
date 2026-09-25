-- Security hardening: remove caller-controlled user scope from legacy vector RPC
-- and keep document search bound to auth.uid().

DROP FUNCTION IF EXISTS public.match_document_chunks(vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, real, integer, uuid);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  file_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::double precision AS similarity,
    d.file_name
  FROM public.document_chunks dc
  JOIN public.documents d
    ON d.id = dc.document_id
   AND d.user_id = auth.uid()
  WHERE dc.user_id = auth.uid()
    AND dc.embedding IS NOT NULL
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.match_document_chunks(vector, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, double precision, integer) TO authenticated;
