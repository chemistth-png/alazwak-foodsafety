
-- Create storage bucket for chat file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Allow authenticated users to read their own files
CREATE POLICY "Authenticated users can read chat files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-files');

-- Allow service role to read files (for edge functions)
CREATE POLICY "Service role can read chat files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'chat-files');
