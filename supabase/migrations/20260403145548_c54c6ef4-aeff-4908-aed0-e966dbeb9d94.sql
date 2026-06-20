-- Create document_chunks table
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chunks" ON public.document_chunks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on chunks" ON public.document_chunks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_chunks_user ON public.document_chunks(user_id);
CREATE INDEX idx_chunks_doc ON public.document_chunks(document_id);
CREATE INDEX idx_chunks_fts ON public.document_chunks USING GIN (to_tsvector('simple', content));

-- Function to chunk a document
CREATE OR REPLACE FUNCTION public.chunk_document()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chunk_size INTEGER := 2000;
  overlap_size INTEGER := 200;
  doc_len INTEGER;
  s INTEGER := 1;
  e INTEGER;
  idx INTEGER := 0;
BEGIN
  DELETE FROM public.document_chunks WHERE document_id = NEW.id;
  doc_len := length(NEW.content);
  
  WHILE s <= doc_len LOOP
    e := LEAST(s + chunk_size - 1, doc_len);
    INSERT INTO public.document_chunks (document_id, user_id, chunk_index, content, file_name)
    VALUES (NEW.id, NEW.user_id, idx, substring(NEW.content FROM s FOR (e - s + 1)), NEW.file_name);
    idx := idx + 1;
    s := e + 1 - overlap_size;
    IF s >= doc_len THEN EXIT; END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_chunk_document
  AFTER INSERT OR UPDATE OF content ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.chunk_document();

-- Improved search function for Arabic text
CREATE OR REPLACE FUNCTION public.search_document_chunks(
  p_user_id UUID, p_query TEXT, p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(id UUID, document_id UUID, file_name TEXT, content TEXT, chunk_index INTEGER, relevance REAL)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT dc.id, dc.document_id, dc.file_name, dc.content, dc.chunk_index,
    (
      ts_rank(to_tsvector('simple', dc.content), plainto_tsquery('simple', p_query)) * 2.0 +
      CASE WHEN dc.content ILIKE '%' || p_query || '%' THEN 1.0 ELSE 0.0 END +
      CASE WHEN dc.file_name ILIKE '%' || p_query || '%' THEN 0.5 ELSE 0.0 END
    )::REAL as relevance
  FROM public.document_chunks dc
  WHERE dc.user_id = p_user_id
    AND (
      to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', p_query)
      OR dc.content ILIKE '%' || p_query || '%'
      OR dc.file_name ILIKE '%' || p_query || '%'
    )
  ORDER BY relevance DESC
  LIMIT p_limit;
$$;
