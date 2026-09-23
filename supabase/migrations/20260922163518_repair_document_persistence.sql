-- Forward-only repair; do not replay conflicting historical migrations on production.
BEGIN;
CREATE OR REPLACE FUNCTION public.chunk_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chunk_size integer := 2000;
  overlap_size integer := 200;
  doc_len integer := coalesce(length(NEW.content), 0);
  s integer := 1;
  e integer;
  idx integer := 0;
BEGIN
  DELETE FROM public.document_chunks WHERE document_id = NEW.id;
  WHILE s <= doc_len LOOP
    e := least(s + chunk_size - 1, doc_len);
    INSERT INTO public.document_chunks
      (document_id, user_id, chunk_index, content, file_name)
    VALUES (NEW.id, NEW.user_id, idx,
      substring(NEW.content FROM s FOR e - s + 1), NEW.file_name);
    EXIT WHEN e >= doc_len;
    idx := idx + 1;
    s := e + 1 - overlap_size;
  END LOOP;
  RETURN NEW;
END;
$$;
-- Trigger-only function: no direct API execution needed.
REVOKE ALL ON FUNCTION public.chunk_document() FROM PUBLIC, anon, authenticated;
ALTER TABLE public.nc_reports
  ADD COLUMN IF NOT EXISTS batch_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lot_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hazard_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ccp_ref text DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_by text DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
NOTIFY pgrst, 'reload schema';
COMMIT;
