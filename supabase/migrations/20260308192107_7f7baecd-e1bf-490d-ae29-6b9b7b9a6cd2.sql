
-- Enable trigram extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index for faster similarity search
CREATE INDEX idx_documents_content_trgm ON public.documents USING gin (content gin_trgm_ops);
CREATE INDEX idx_documents_file_name_trgm ON public.documents USING gin (file_name gin_trgm_ops);

-- Function to search documents by text similarity
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
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.file_name,
    d.content,
    GREATEST(
      similarity(d.content, p_query),
      similarity(d.file_name, p_query),
      word_similarity(p_query, d.content)
    ) AS similarity_score
  FROM public.documents d
  WHERE d.user_id = p_user_id
    AND (
      d.content % p_query
      OR d.file_name % p_query
      OR p_query % d.content
    )
  ORDER BY similarity_score DESC
  LIMIT p_limit;
$$;
