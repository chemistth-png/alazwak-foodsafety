
-- 1) Storage policies for chat-files: scope by user folder
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read chat files" ON storage.objects;

CREATE POLICY "Users read own chat files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users upload own chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) Refactor search_documents to SECURITY INVOKER using auth.uid()
DROP FUNCTION IF EXISTS public.search_documents(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.search_documents(p_query text, p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, file_name text, content text, similarity_score real)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
  WHERE d.user_id = auth.uid()
    AND (
      extensions.similarity(d.content, p_query) > 0.1
      OR extensions.similarity(d.file_name, p_query) > 0.1
      OR extensions.word_similarity(p_query, d.content) > 0.1
    )
  ORDER BY similarity_score DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.search_documents(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_documents(text, integer) TO authenticated;

-- 3) Refactor search_document_chunks to SECURITY INVOKER using auth.uid()
DROP FUNCTION IF EXISTS public.search_document_chunks(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.search_document_chunks(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, document_id uuid, file_name text, content text, chunk_index integer, relevance real)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT dc.id, dc.document_id, dc.file_name, dc.content, dc.chunk_index,
    (
      ts_rank(to_tsvector('simple', dc.content), plainto_tsquery('simple', p_query)) * 2.0 +
      CASE WHEN dc.content ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0.0 END +
      CASE WHEN dc.file_name ILIKE '%' || p_query || '%' THEN 0.5 ELSE 0.0 END
    )::REAL as relevance
  FROM public.document_chunks dc
  WHERE dc.user_id = auth.uid()
    AND (
      to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', p_query)
      OR dc.content ILIKE '%' || p_query || '%'
      OR dc.file_name ILIKE '%' || p_query || '%'
    )
  ORDER BY relevance DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.search_document_chunks(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_document_chunks(text, integer) TO authenticated;
