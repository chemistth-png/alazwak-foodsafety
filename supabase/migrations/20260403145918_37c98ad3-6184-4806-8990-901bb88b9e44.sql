INSERT INTO public.document_chunks (document_id, user_id, chunk_index, content, file_name)
SELECT d.id, d.user_id, 
  gs.idx,
  substring(d.content FROM (gs.idx * 1800 + 1) FOR 2000),
  d.file_name
FROM public.documents d
CROSS JOIN generate_series(0, (length(d.content) / 1800)) AS gs(idx)
WHERE length(substring(d.content FROM (gs.idx * 1800 + 1) FOR 2000)) > 0
AND NOT EXISTS (SELECT 1 FROM public.document_chunks c WHERE c.document_id = d.id);