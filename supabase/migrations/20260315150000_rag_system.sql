
-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table to store document chunks and their embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(1536), -- 1536 is the dimension for OpenAI text-embedding-3-small
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_chunks
CREATE POLICY "Users can view own document chunks" ON public.document_chunks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document chunks" ON public.document_chunks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document chunks" ON public.document_chunks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create an index for faster vector similarity search
CREATE INDEX ON public.document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create a function to search for document chunks using vector similarity
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  file_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.file_name
  FROM public.document_chunks dc
  JOIN public.documents d ON d.id = dc.document_id
  WHERE dc.user_id = p_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
