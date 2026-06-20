CREATE TABLE public.nc_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'product',
  severity TEXT NOT NULL DEFAULT 'minor',
  corrective_action TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nc_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nc" ON public.nc_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own nc" ON public.nc_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own nc" ON public.nc_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own nc" ON public.nc_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_nc_reports_updated_at
BEFORE UPDATE ON public.nc_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nc_reports_user ON public.nc_reports(user_id, created_at DESC);