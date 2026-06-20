
CREATE TABLE IF NOT EXISTS public.master_templates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_sops (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES public.master_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Under Review','Approved','Obsolete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.master_templates(category);
CREATE INDEX IF NOT EXISTS idx_sops_template ON public.company_sops(template_id);
CREATE INDEX IF NOT EXISTS idx_sops_status ON public.company_sops(status);

ALTER TABLE public.master_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by authenticated"
  ON public.master_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Company SOPs readable by authenticated"
  ON public.company_sops FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_company_sops_updated_at
  BEFORE UPDATE ON public.company_sops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.master_templates (title, file_path, category) VALUES
  ('F-12-2 فريق سحب المنتجات H', 'Horus_FSMS/12-Traceability/Forms/F-12-2 فريق سحب المنتجات H.docx', 'Traceability'),
  ('F-12-2 فريق سحب المنتجات', 'Horus_FSMS/12-Traceability/Forms/F-12-2 فريق سحب المنتجات.docx', 'Traceability'),
  ('F-21-13 إدارة المخازن', 'Horus_FSMS/21-Warehouse/Forms/F-21-13.docx', 'Warehouse Management'),
  ('F-21-7 إدارة المخازن', 'Horus_FSMS/21-Warehouse/Forms/F-21-7.docx', 'Warehouse Management'),
  ('F-21-8 إدارة المخازن', 'Horus_FSMS/21-Warehouse/Forms/F-21-8.docx', 'Warehouse Management'),
  ('F-21-9 إدارة المخازن', 'Horus_FSMS/21-Warehouse/Forms/F-21-9.docx', 'Warehouse Management'),
  ('F-22-03 نظافة السيارات منتجات نهائية', 'Horus_FSMS/22-Cleaning/Forms/F-22-03-final.docx', 'Cleaning & Sanitation'),
  ('F-22-03 نظافة السيارات مواد خام', 'Horus_FSMS/22-Cleaning/Forms/F-22-03-raw.docx', 'Cleaning & Sanitation'),
  ('إجراء التنظيف والتطهير', 'Horus_FSMS/22-Cleaning/Procedure/cleaning-sanitation.docx', 'Cleaning & Sanitation'),
  ('WI7 تعليمات عمل الإنتاج', 'Horus_FSMS/23-Production/Forms/WI7.docx', 'Production'),
  ('نموذج تصفية أمر شغل F-23-2', 'Horus_FSMS/23-Production/Forms/F-23-2.docx', 'Production'),
  ('F-24-01 تقرير تحليل المنتج النهائي', 'Horus_FSMS/24-QualityControl/Forms/F-24-01.docx', 'Quality Control'),
  ('تحليل مخاطر بيئية', 'Horus_FSMS/26-HACCP/Forms/env-hazard-analysis.docx', 'HACCP'),
  ('HACCP 02 - إجراء', 'Horus_FSMS/26-HACCP/Procedure/HACCP-02.docx', 'HACCP'),
  ('F-27-1 نموذج تقييم الثغرات', 'Horus_FSMS/27-VACCP/Forms/F-27-1.docx', 'VACCP / Food Defense'),
  ('F-27-2 نموذج تحديد التهديدات', 'Horus_FSMS/27-VACCP/Forms/F-27-2.docx', 'VACCP / Food Defense'),
  ('F-27-3 خطة الدفاع عن الغذاء', 'Horus_FSMS/27-VACCP/Forms/F-27-3.docx', 'VACCP / Food Defense'),
  ('F-27-4 سجل الحوادث الأمنية', 'Horus_FSMS/27-VACCP/Forms/F-27-4.docx', 'VACCP / Food Defense'),
  ('F-27-5 سجل تدريب الدفاع عن الغذاء', 'Horus_FSMS/27-VACCP/Forms/F-27-5.docx', 'VACCP / Food Defense'),
  ('FSP-27 إجراء الدفاع عن الغذاء VACCP', 'Horus_FSMS/27-VACCP/Procedure/FSP-27.docx', 'VACCP / Food Defense'),
  ('F-28-1 تقييم ثغرات المواد الخام', 'Horus_FSMS/28-TACCP/Forms/F-28-1.docx', 'TACCP / Food Fraud'),
  ('F-28-2 تحديد التهديدات الاقتصادية', 'Horus_FSMS/28-TACCP/Forms/F-28-2.docx', 'TACCP / Food Fraud'),
  ('F-28-3 خطة مكافحة الغش الغذائي', 'Horus_FSMS/28-TACCP/Forms/F-28-3.docx', 'TACCP / Food Fraud'),
  ('F-28-4 سجل حالات الغش المشتبه', 'Horus_FSMS/28-TACCP/Forms/F-28-4.docx', 'TACCP / Food Fraud'),
  ('F-28-5 سجل فحص الموردين', 'Horus_FSMS/28-TACCP/Forms/F-28-5.docx', 'TACCP / Food Fraud'),
  ('FSP-28 إجراء مكافحة الغش الغذائي TACCP', 'Horus_FSMS/28-TACCP/Procedure/FSP-28.docx', 'TACCP / Food Fraud'),
  ('F-29-1 قائمة المواد المسببة للحساسية', 'Horus_FSMS/29-Allergen/Forms/F-29-1.docx', 'Allergen Management'),
  ('F-29-2 تقييم مخاطر الحساسية', 'Horus_FSMS/29-Allergen/Forms/F-29-2.docx', 'Allergen Management'),
  ('F-29-3 سجل فحص بطاقات البيان', 'Horus_FSMS/29-Allergen/Forms/F-29-3.docx', 'Allergen Management'),
  ('F-29-4 سجل التنظيف للحساسية', 'Horus_FSMS/29-Allergen/Forms/F-29-4.docx', 'Allergen Management'),
  ('F-29-5 شهادات الموردين للحساسية', 'Horus_FSMS/29-Allergen/Forms/F-29-5.docx', 'Allergen Management'),
  ('FSP-29 إدارة المواد المسببة للحساسية', 'Horus_FSMS/29-Allergen/Procedure/FSP-29.docx', 'Allergen Management'),
  ('F-30-1 نموذج تقرير الأزمة', 'Horus_FSMS/30-Crisis/Forms/F-30-1.docx', 'Crisis Management'),
  ('F-30-2 قائمة فريق إدارة الأزمات', 'Horus_FSMS/30-Crisis/Forms/F-30-2.docx', 'Crisis Management'),
  ('F-30-3 خطة التواصل', 'Horus_FSMS/30-Crisis/Forms/F-30-3.docx', 'Crisis Management'),
  ('F-30-4 سجل قرارات الأزمات', 'Horus_FSMS/30-Crisis/Forms/F-30-4.docx', 'Crisis Management'),
  ('F-30-5 تقرير ما بعد الأزمة', 'Horus_FSMS/30-Crisis/Forms/F-30-5.docx', 'Crisis Management'),
  ('FSP-30 إجراء إدارة الأزمات', 'Horus_FSMS/30-Crisis/Procedure/FSP-30.docx', 'Crisis Management'),
  ('F-31-1 تقرير الاستدعاء التجريبي', 'Horus_FSMS/31-MockRecall/Forms/F-31-1.docx', 'Mock Recall'),
  ('F-31-2 سجل التواصل مع العملاء', 'Horus_FSMS/31-MockRecall/Forms/F-31-2.docx', 'Mock Recall'),
  ('F-31-3 نموذج تتبع المنتج', 'Horus_FSMS/31-MockRecall/Forms/F-31-3.docx', 'Mock Recall'),
  ('FSP-31 إجراء الاستدعاء التجريبي Mock Recall', 'Horus_FSMS/31-MockRecall/Procedure/FSP-31.docx', 'Mock Recall'),
  ('الأعراض المرضية الموجبة للإبلاغ', 'Horus_FSMS/7-Resource/Forms/symptoms-report.docx', 'Resource Management'),
  ('السجل المرضي للأمراض المنقولة عبر الغذاء', 'Horus_FSMS/7-Resource/Forms/foodborne-illness-log.docx', 'Resource Management'),
  ('نماذج الشئون الإدارية', 'Horus_FSMS/7-Resource/Forms/hr-forms.docx', 'Resource Management'),
  ('نموذج استبعاد مريض', 'Horus_FSMS/7-Resource/Forms/sick-exclusion.docx', 'Resource Management'),
  ('F-07-25 استقصاء الحالة الصحية للعامل', 'Horus_FSMS/7-Resource/Forms/F-07-25.docx', 'Resource Management'),
  ('نموذج العودة إلى العمل', 'Horus_FSMS/7-Resource/Forms/return-to-work.docx', 'Resource Management'),
  ('Resource Management Process', 'Horus_FSMS/7-Resource/Procedure/RMP.docx', 'Resource Management'),
  ('TACCP Food Defense Plan', 'Horus_FSMS/TACCP_Food_Defense_Plan.docx', 'General'),
  ('VACCP Food Fraud Vulnerability Plan', 'Horus_FSMS/VACCP_Food_Fraud_Vulnerability_Plan.docx', 'General')
ON CONFLICT (file_path) DO NOTHING;
