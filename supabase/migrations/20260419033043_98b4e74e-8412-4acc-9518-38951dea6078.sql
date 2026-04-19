CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.haccp_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'خطة HACCP',
  doc_number TEXT DEFAULT '',
  hazards JSONB NOT NULL DEFAULT '[]'::jsonb,
  ccps JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.haccp_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own haccp" ON public.haccp_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own haccp" ON public.haccp_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own haccp" ON public.haccp_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own haccp" ON public.haccp_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.flowcharts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'مخطط تدفق',
  type TEXT NOT NULL DEFAULT 'flowchart',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flowcharts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own flowcharts" ON public.flowcharts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flowcharts" ON public.flowcharts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flowcharts" ON public.flowcharts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own flowcharts" ON public.flowcharts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.telegram_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  bot_token TEXT,
  chat_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own telegram" ON public.telegram_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own telegram" ON public.telegram_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own telegram" ON public.telegram_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own telegram" ON public.telegram_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reference_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference_id)
);
ALTER TABLE public.reference_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own favs" ON public.reference_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favs" ON public.reference_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favs" ON public.reference_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_haccp_updated BEFORE UPDATE ON public.haccp_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_flow_updated BEFORE UPDATE ON public.flowcharts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tg_updated BEFORE UPDATE ON public.telegram_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();