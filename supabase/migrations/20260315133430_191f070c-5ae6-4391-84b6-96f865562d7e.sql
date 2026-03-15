-- Fix RLS policies: change from 'public' to 'authenticated' role

-- conversations table
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- messages table
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;

CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

-- sops table
DROP POLICY IF EXISTS "Users can delete own sops" ON public.sops;
DROP POLICY IF EXISTS "Users can insert own sops" ON public.sops;
DROP POLICY IF EXISTS "Users can update own sops" ON public.sops;
DROP POLICY IF EXISTS "Users can view own sops" ON public.sops;

CREATE POLICY "Users can delete own sops" ON public.sops FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sops" ON public.sops FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sops" ON public.sops FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sops" ON public.sops FOR SELECT TO authenticated USING (auth.uid() = user_id);