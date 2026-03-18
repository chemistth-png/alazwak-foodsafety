
-- Create the chat-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Allow authenticated users to read their uploaded files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-files');

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access to chat-files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'chat-files');
