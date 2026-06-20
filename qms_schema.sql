-- ============================================
-- QMS Schema for Alazwak FoodSafety
-- Supabase-compatible PostgreSQL
-- ============================================

-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: master_templates
-- Stores all QMS document templates
-- ============================================
CREATE TABLE IF NOT EXISTS master_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Table: company_sops
-- Stores company-specific SOPs derived from templates
-- ============================================
CREATE TABLE IF NOT EXISTS company_sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES master_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'obsolete')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE master_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_sops ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates
CREATE POLICY "Allow read access to master_templates"
    ON master_templates FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users full access to company_sops
CREATE POLICY "Allow full access to company_sops"
    ON company_sops FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Seed Data: master_templates
-- ============================================

-- Category: HACCP
INSERT INTO master_templates (title, file_path, category) VALUES ('HACCP 02', 'master_templates/HACCP 02.docx', 'HACCP');
INSERT INTO master_templates (title, file_path, category) VALUES ('تحليل مخاطر بيئية', 'master_templates/تحليل مخاطر بيئية.docx', 'HACCP');

-- Category: Food Defense
INSERT INTO master_templates (title, file_path, category) VALUES ('TACCP_Food_Defense_Plan', 'master_templates/TACCP_Food_Defense_Plan.docx', 'Food Defense');

-- Category: Food Fraud
INSERT INTO master_templates (title, file_path, category) VALUES ('VACCP_Food_Fraud_Vulnerability_Plan', 'master_templates/VACCP_Food_Fraud_Vulnerability_Plan.docx', 'Food Fraud');

-- Category: Traceability
INSERT INTO master_templates (title, file_path, category) VALUES ('F-12-2 فريق سحب المنتجات H', 'master_templates/F-12-2 فريق سحب المنتجات H.docx', 'Traceability');
INSERT INTO master_templates (title, file_path, category) VALUES ('F-12-2 فريق سحب المنتجات', 'master_templates/F-12-2 فريق سحب المنتجات.docx', 'Traceability');

-- Category: Warehouse
INSERT INTO master_templates (title, file_path, category) VALUES ('F-21-13', 'master_templates/F-21-13.docx', 'Warehouse');
INSERT INTO master_templates (title, file_path, category) VALUES ('F-21-7', 'master_templates/F-21-7.docx', 'Warehouse');
INSERT INTO master_templates (title, file_path, category) VALUES ('F-21-8', 'master_templates/F-21-8.docx', 'Warehouse');
INSERT INTO master_templates (title, file_path, category) VALUES ('F-21-9', 'master_templates/F-21-9.docx', 'Warehouse');

-- Category: Cleaning and Sanitation
INSERT INTO master_templates (title, file_path, category) VALUES ('نظافة السيارات منتجات نهائيةF-22-03', 'master_templates/نظافة السيارات منتجات نهائيةF-22-03.docx', 'Cleaning and Sanitation');
INSERT INTO master_templates (title, file_path, category) VALUES ('نظافة السيارات مواد خامF-22-03', 'master_templates/نظافة السيارات مواد خامF-22-03.docx', 'Cleaning and Sanitation');
INSERT INTO master_templates (title, file_path, category) VALUES ('اجراء التنظيف والتطهير', 'master_templates/اجراء التنظيف والتطهير.docx', 'Cleaning and Sanitation');

-- Category: Production
INSERT INTO master_templates (title, file_path, category) VALUES ('WI7', 'master_templates/WI7.docx', 'Production');
INSERT INTO master_templates (title, file_path, category) VALUES ('نموذج تصفية أمر شغل  F-23-2', 'master_templates/نموذج تصفية أمر شغل  F-23-2.docx', 'Production');

-- Category: Quality Control
INSERT INTO master_templates (title, file_path, category) VALUES ('F24-01تقرير تحليل المنتج النهائي', 'master_templates/F24-01تقرير تحليل المنتج النهائي.docx', 'Quality Control');

-- Category: Resource Management
INSERT INTO master_templates (title, file_path, category) VALUES ('الاعراض المرضية التى تسوجب إبلاغ المسؤلينHorus', 'master_templates/الاعراض المرضية التى تسوجب إبلاغ المسؤلينHorus.docx', 'Resource Management');
INSERT INTO master_templates (title, file_path, category) VALUES ('السجل المرضى  للامراض المنقولة عبر الغذاء Horus', 'master_templates/السجل المرضى  للامراض المنقولة عبر الغذاء Horus.docx', 'Resource Management');
INSERT INTO master_templates (title, file_path, category) VALUES ('نماذج الشئون الادارية  Horus', 'master_templates/نماذج الشئون الادارية  Horus.docx', 'Resource Management');
INSERT INTO master_templates (title, file_path, category) VALUES ('نموذج استبعاد مريض Hours', 'master_templates/نموذج استبعاد مريض Hours.docx', 'Resource Management');
INSERT INTO master_templates (title, file_path, category) VALUES ('نموذج استقصاء الحالة الصحية لعامل قبل التعيين أثناء العملF-07-25Horus', 'master_templates/نموذج استقصاء الحالة الصحية لعامل قبل التعيين أثناء العملF-07-25Horus.docx', 'Resource Management');
INSERT INTO master_templates (title, file_path, category) VALUES ('نموذج العودة الى العمل Horus', 'master_templates/نموذج العودة الى العمل Horus.docx', 'Resource Management');
INSERT INTO master_templates (title, file_path, category) VALUES ('Resource Management Process (1) Horus', 'master_templates/Resource Management Process (1) Horus.docx', 'Resource Management');

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_master_templates_category ON master_templates(category);
CREATE INDEX IF NOT EXISTS idx_company_sops_template_id ON company_sops(template_id);
CREATE INDEX IF NOT EXISTS idx_company_sops_status ON company_sops(status);
