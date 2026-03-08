
-- Drop dependent indexes first, then move extension
DROP INDEX IF EXISTS idx_documents_content_trgm;
DROP INDEX IF EXISTS idx_documents_file_name_trgm;
DROP FUNCTION IF EXISTS public.search_documents;
DROP EXTENSION IF EXISTS pg_trgm;

-- Recreate in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate indexes using extensions schema operators
CREATE INDEX idx_documents_content_trgm ON public.documents USING gin (content extensions.gin_trgm_ops);
CREATE INDEX idx_documents_file_name_trgm ON public.documents USING gin (file_name extensions.gin_trgm_ops);

-- Recreate search function
CREATE OR REPLACE FUNCTION public.search_documents(
  p_user_id uuid,
  p_query text,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  file_name text,
  content text,
  similarity_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    d.id,
    d.file_name,
    d.content,
    GREATEST(
      extensions.similarity(d.content, p_query),
      extensions.similarity(d.file_name, p_query),
      extensions.word_similarity(p_query, d.content)
    ) AS similarity_score
  FROM public.documents d
  WHERE d.user_id = p_user_id
    AND (
      extensions.similarity(d.content, p_query) > 0.1
      OR extensions.similarity(d.file_name, p_query) > 0.1
      OR extensions.word_similarity(p_query, d.content) > 0.1
    )
  ORDER BY similarity_score DESC
  LIMIT p_limit;
$$;
