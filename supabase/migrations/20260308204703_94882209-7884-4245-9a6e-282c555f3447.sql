
-- Agent tasks table for tracking all quality management tasks
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'cleaning_plan', 'training_plan', 'risk_assessment', 'water_monitoring', 'haccp', 'performance_eval', 'general'
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'review', 'approved', 'revision', 'completed'
  content jsonb DEFAULT '{}'::jsonb,
  ai_output text DEFAULT '',
  user_feedback text DEFAULT '',
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.agent_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.agent_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.agent_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.agent_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
