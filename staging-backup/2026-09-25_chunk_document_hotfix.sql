-- Staging hotfix captured 2026-09-25.
-- Fixes terminal chunk loop in public.chunk_document().
CREATE OR REPLACE FUNCTION public.chunk_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  chunk_size integer := 2000;
  overlap_size integer := 200;
  doc_len integer;
  s integer := 1;
  e integer;
  idx integer := 0;
BEGIN
  DELETE FROM public.document_chunks WHERE document_id = NEW.id;
  doc_len := length(NEW.content);
  WHILE s <= doc_len LOOP
    e := LEAST(s + chunk_size - 1, doc_len);
    INSERT INTO public.document_chunks(document_id,user_id,chunk_index,content,file_name)
    VALUES(NEW.id,NEW.user_id,idx,substring(NEW.content FROM s FOR (e-s+1)),NEW.file_name);
    idx := idx + 1;
    EXIT WHEN e >= doc_len;
    s := e + 1 - overlap_size;
  END LOOP;
  RETURN NEW;
END;
$function$;
