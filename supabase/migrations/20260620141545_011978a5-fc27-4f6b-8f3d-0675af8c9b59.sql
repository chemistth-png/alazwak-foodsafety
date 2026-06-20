
-- 1) audit_logs: remove client INSERT policy; provide a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_entity_title text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_allowed text[] := ARRAY[
    'delete_task','approve_task','revise_task','generate_task',
    'delete_document','delete_conversation','delete_sop',
    'clear_chat','upload_document','export_task'
  ];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_action IS NULL OR NOT (p_action = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;
  IF p_entity_type IS NULL OR length(p_entity_type) = 0 OR length(p_entity_type) > 64 THEN
    RAISE EXCEPTION 'Invalid entity_type';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, entity_title, details)
  VALUES (v_uid, p_action, p_entity_type, p_entity_id, p_entity_title, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb) TO authenticated;

-- 2) messages: add UPDATE and DELETE policies scoped to the owning conversation
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON public.messages;

CREATE POLICY "Users can delete messages in own conversations"
ON public.messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in own conversations"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);
