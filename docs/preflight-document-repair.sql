-- READ ONLY: run in the target database before deployment. No user records.
BEGIN READ ONLY;
SELECT current_database(), current_setting('server_version') AS postgres_version;
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('documents','document_chunks','nc_reports')
ORDER BY table_name, ordinal_position;
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('documents','document_chunks','nc_reports');
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname IN ('public','storage')
AND tablename IN ('documents','document_chunks','nc_reports','objects') ORDER BY tablename,policyname;
SELECT pg_get_functiondef('public.chunk_document()'::regprocedure);
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid='public.documents'::regclass AND NOT tgisinternal;
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='chat-files';
ROLLBACK;
