
CREATE TABLE public.sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  doc_number TEXT DEFAULT '',
  revision TEXT DEFAULT '01',
  category TEXT DEFAULT '',
  department TEXT DEFAULT '',
  prepared_by TEXT DEFAULT '',
  approved_by TEXT DEFAULT '',
  effective_date TEXT DEFAULT '',
  purpose TEXT DEFAULT '',
  scope TEXT DEFAULT '',
  definitions TEXT DEFAULT '',
  "references" TEXT DEFAULT '',
  safety_notes TEXT DEFAULT '',
  records TEXT DEFAULT '',
  steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sops" ON public.sops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sops" ON public.sops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sops" ON public.sops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sops" ON public.sops FOR DELETE USING (auth.uid() = user_id);
