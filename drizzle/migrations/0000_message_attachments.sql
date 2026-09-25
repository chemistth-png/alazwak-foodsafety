CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, document_id)
);
REVOKE ALL ON public.message_attachments FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT ALL ON public.message_attachments TO service_role;
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments (message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_document_id ON public.message_attachments (document_id);
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own message attachments" ON public.message_attachments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id WHERE m.id = message_attachments.message_id AND c.user_id = auth.uid()));
CREATE POLICY "Users insert own message attachments" ON public.message_attachments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id WHERE m.id = message_attachments.message_id AND c.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = message_attachments.document_id AND d.user_id = auth.uid())
);