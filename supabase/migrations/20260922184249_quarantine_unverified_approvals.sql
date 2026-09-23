-- Containment, not an electronic-signature workflow. Preserve legacy evidence.
CREATE OR REPLACE FUNCTION public.guard_unverified_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'haccp_plans' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Electronic approval is unavailable; save a draft' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.signature_data, '{}'::jsonb) <> '{}'::jsonb THEN
        RAISE EXCEPTION 'Client signatures are not accepted' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.signature_data IS DISTINCT FROM OLD.signature_data THEN
      RAISE EXCEPTION 'Legacy signature evidence is read-only' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.status IS NULL OR NEW.status NOT IN ('open', 'in_progress', 'closed') THEN
      RAISE EXCEPTION 'Effectiveness verification requires an authorized workflow' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.verified_by, '') <> '' OR NEW.verified_at IS NOT NULL THEN
        RAISE EXCEPTION 'Client verification is not accepted' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.verified_by IS DISTINCT FROM OLD.verified_by OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Legacy verification evidence is read-only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_unverified_approval() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_haccp_approval ON public.haccp_plans;
CREATE TRIGGER guard_haccp_approval BEFORE INSERT OR UPDATE ON public.haccp_plans
FOR EACH ROW EXECUTE FUNCTION public.guard_unverified_approval();
DROP TRIGGER IF EXISTS guard_nc_verification ON public.nc_reports;
CREATE TRIGGER guard_nc_verification BEFORE INSERT OR UPDATE ON public.nc_reports
FOR EACH ROW EXECUTE FUNCTION public.guard_unverified_approval();
NOTIFY pgrst, 'reload schema';
