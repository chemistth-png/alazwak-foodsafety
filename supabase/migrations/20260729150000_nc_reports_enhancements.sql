-- Enhancement: Add food safety compliance fields to nc_reports
-- Adds batch/lot traceability, hazard classification, CCP reference, and verification workflow

ALTER TABLE public.nc_reports
  ADD COLUMN IF NOT EXISTS batch_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS lot_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS hazard_type TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ccp_ref TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add 'verified' to the status workflow (open -> in_progress -> closed -> verified)
COMMENT ON COLUMN public.nc_reports.batch_number IS 'Production batch number for traceability (ISO 22000 §8.9)';
COMMENT ON COLUMN public.nc_reports.lot_code IS 'Lot/batch code for product traceability';
COMMENT ON COLUMN public.nc_reports.hazard_type IS 'Hazard classification: biological, chemical, physical, allergen';
COMMENT ON COLUMN public.nc_reports.ccp_ref IS 'Reference to related CCP (Critical Control Point)';
COMMENT ON COLUMN public.nc_reports.verified_by IS 'QA Manager who verified CAPA effectiveness';
COMMENT ON COLUMN public.nc_reports.verified_at IS 'Timestamp of CAPA verification';
