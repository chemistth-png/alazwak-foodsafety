BEGIN;
CREATE SCHEMA IF NOT EXISTS approval_private;
REVOKE ALL ON SCHEMA approval_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA approval_private TO authenticated;
CREATE TABLE approval_private.settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false);
INSERT INTO approval_private.settings VALUES (true,false);
-- Record-scoped assignments, provisioned by the database operator, never by clients.
CREATE TABLE approval_private.assignments (
  kind text NOT NULL CHECK(kind IN ('haccp','nc')), record_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id), role text NOT NULL CHECK(role IN ('reviewer','approver')),
  PRIMARY KEY(kind,record_id,actor_id,role)
);
CREATE TABLE approval_private.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, record_id uuid NOT NULL,
  revision bigint NOT NULL, action text NOT NULL CHECK(action IN ('submit','review','approve','reject')),
  actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  evidence text NOT NULL CHECK(length(btrim(evidence)) BETWEEN 10 AND 4000),
  snapshot jsonb NOT NULL, digest text NOT NULL,
  UNIQUE(kind,record_id,revision,action)
);
CREATE INDEX approval_events_record ON approval_private.events(kind,record_id,revision);
ALTER TABLE approval_private.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_private.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_private.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA approval_private FROM PUBLIC, anon, authenticated;
ALTER TABLE public.haccp_plans ADD COLUMN approval_revision bigint NOT NULL DEFAULT 1;
ALTER TABLE public.nc_reports ADD COLUMN approval_revision bigint NOT NULL DEFAULT 1;
CREATE FUNCTION approval_private.bump_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.approval_revision:=1;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Record identity cannot change' USING ERRCODE='42501';
    END IF;
    NEW.approval_revision:=OLD.approval_revision+1;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION approval_private.bump_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER approval_revision BEFORE INSERT OR UPDATE ON public.haccp_plans
FOR EACH ROW EXECUTE FUNCTION approval_private.bump_revision();
CREATE TRIGGER approval_revision BEFORE INSERT OR UPDATE ON public.nc_reports
FOR EACH ROW EXECUTE FUNCTION approval_private.bump_revision();

-- Keep submitted records addressable and prevent delete/reinsert approval replay.
CREATE FUNCTION approval_private.protect_submitted_record() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid()<>OLD.user_id THEN
    RAISE EXCEPTION 'Owner session required for deletion' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM approval_private.events e WHERE e.record_id=OLD.id
    AND e.kind=CASE WHEN TG_TABLE_NAME='haccp_plans' THEN 'haccp' ELSE 'nc' END) THEN
    RAISE EXCEPTION 'Submitted records must be retained' USING ERRCODE='42501'; END IF;
  RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION approval_private.protect_submitted_record() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER retain_submitted BEFORE DELETE ON public.haccp_plans
FOR EACH ROW EXECUTE FUNCTION approval_private.protect_submitted_record();
CREATE TRIGGER retain_submitted BEFORE DELETE ON public.nc_reports
FOR EACH ROW EXECUTE FUNCTION approval_private.protect_submitted_record();

-- Definer is necessary for append-only events and narrowly scoped cross-owner review.
-- Every call checks a live user/session and record-specific access. No client status writes.
CREATE FUNCTION approval_private.workflow(p_kind text,p_id uuid,p_action text,p_revision bigint,p_evidence text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  actor uuid:=auth.uid(); claims jsonb:=auth.jwt(); source jsonb; owner_id uuid;
  rev bigint; fingerprint text; state text; reviewer uuid; history jsonb; allowed boolean;
BEGIN
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=actor AND NOT coalesce(u.is_anonymous,false))
    OR NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id::text=claims->>'session_id' AND s.user_id=actor AND (s.not_after IS NULL OR s.not_after>now())) THEN
    RAISE EXCEPTION 'A live authenticated session is required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM approval_private.settings WHERE enabled) THEN
    RAISE EXCEPTION 'Approval workflow has not been enabled' USING ERRCODE='42501';
  END IF;
  IF p_kind='haccp' THEN
    SELECT to_jsonb(t) INTO source FROM public.haccp_plans t WHERE t.id=p_id FOR UPDATE;
  ELSIF p_kind='nc' THEN
    SELECT to_jsonb(t) INTO source FROM public.nc_reports t WHERE t.id=p_id FOR UPDATE;
  ELSE RAISE EXCEPTION 'Invalid record kind' USING ERRCODE='22023'; END IF;
  owner_id:=(source->>'user_id')::uuid;
  allowed:=actor=owner_id OR EXISTS(SELECT 1 FROM approval_private.assignments a
    WHERE a.kind=p_kind AND a.record_id=p_id AND a.actor_id=actor);
  IF source IS NULL OR NOT coalesce(allowed,false) THEN
    RAISE EXCEPTION 'Record unavailable' USING ERRCODE='42501';
  END IF;
  rev:=(source->>'approval_revision')::bigint;
  -- Legacy claims are never included as proof of approval.
  source:=source-ARRAY['signature_data','verified_by','verified_at'];
  fingerprint:=encode(sha256(convert_to(source::text,'UTF8')),'hex');
  SELECT CASE WHEN bool_or(e.action='reject') THEN 'rejected'
    WHEN bool_or(e.action='approve') THEN 'approved' WHEN bool_or(e.action='review') THEN 'reviewed'
    WHEN bool_or(e.action='submit') THEN 'submitted' ELSE 'draft' END INTO state
    FROM approval_private.events e WHERE e.kind=p_kind AND e.record_id=p_id AND e.revision=rev;
  IF p_action IS DISTINCT FROM 'read' THEN
    IF p_action IS NULL OR p_action NOT IN ('submit','review','approve','reject') THEN
      RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
    IF p_revision IS DISTINCT FROM rev THEN RAISE EXCEPTION 'Revision changed; reload' USING ERRCODE='40001'; END IF;
    IF claims->>'aal' IS DISTINCT FROM 'aal2' OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(claims->'amr','[]'::jsonb)) m
      WHERE m->>'method'='totp' AND (m->>'timestamp')::numeric
        BETWEEN extract(epoch FROM clock_timestamp())-300 AND extract(epoch FROM clock_timestamp())+30
    ) THEN
      RAISE EXCEPTION 'MFA verification is required' USING ERRCODE='42501'; END IF;
    IF p_evidence IS NULL OR length(btrim(p_evidence)) NOT BETWEEN 10 AND 4000 THEN
      RAISE EXCEPTION 'Evidence must contain 10 to 4000 characters' USING ERRCODE='22023'; END IF;
    IF p_action='submit' THEN
      IF actor<>owner_id OR state<>'draft' THEN RAISE EXCEPTION 'Cannot submit' USING ERRCODE='42501'; END IF;
      IF p_kind='nc' AND (source->>'status'<>'closed' OR length(btrim(source->>'corrective_action'))=0) THEN
        RAISE EXCEPTION 'Close the NCR and record corrective action before submission' USING ERRCODE='22023'; END IF;
    ELSE
      IF actor=owner_id THEN RAISE EXCEPTION 'Self approval is prohibited' USING ERRCODE='42501'; END IF;
      IF p_action='review' AND state<>'submitted' OR p_action='approve' AND state<>'reviewed'
        OR p_action='reject' AND state NOT IN ('submitted','reviewed') THEN
        RAISE EXCEPTION 'Invalid transition' USING ERRCODE='42501'; END IF;
      IF NOT EXISTS(SELECT 1 FROM approval_private.assignments a WHERE a.kind=p_kind AND a.record_id=p_id
        AND a.actor_id=actor AND a.role=CASE WHEN state='submitted' THEN 'reviewer' ELSE 'approver' END) THEN
        RAISE EXCEPTION 'Assigned role required' USING ERRCODE='42501'; END IF;
      SELECT e.actor_id INTO reviewer FROM approval_private.events e
        WHERE e.kind=p_kind AND e.record_id=p_id AND e.revision=rev AND e.action='review';
      IF state='reviewed' AND actor=reviewer THEN RAISE EXCEPTION 'Reviewer and approver must differ' USING ERRCODE='42501'; END IF;
    END IF;
    INSERT INTO approval_private.events(kind,record_id,revision,action,actor_id,evidence,snapshot,digest)
      VALUES(p_kind,p_id,rev,p_action,actor,btrim(p_evidence),source,fingerprint);
    state:=CASE p_action WHEN 'submit' THEN 'submitted' WHEN 'review' THEN 'reviewed'
      WHEN 'approve' THEN 'approved' ELSE 'rejected' END;
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'revision',e.revision,'action',e.action,
    'actor_id',e.actor_id,'recorded_at',e.recorded_at,'evidence',e.evidence,'digest',e.digest)
    ORDER BY e.revision,e.recorded_at,e.id),'[]'::jsonb) INTO history FROM approval_private.events e
    WHERE e.kind=p_kind AND e.record_id=p_id;
  RETURN jsonb_build_object('kind',p_kind,'record_id',p_id,'revision',rev,'state',state,
    'snapshot',source,'digest',fingerprint,'events',history,
    'is_owner',actor=owner_id,'roles',(SELECT coalesce(jsonb_agg(a.role),'[]'::jsonb) FROM approval_private.assignments a
      WHERE a.kind=p_kind AND a.record_id=p_id AND a.actor_id=actor));
END; $$;
REVOKE ALL ON FUNCTION approval_private.workflow(text,uuid,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION approval_private.workflow(text,uuid,text,bigint,text) TO authenticated;
CREATE FUNCTION public.record_approval(p_kind text,p_id uuid,p_action text,p_revision bigint DEFAULT NULL,p_evidence text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT approval_private.workflow(p_kind,p_id,p_action,p_revision,p_evidence);
$$;
REVOKE ALL ON FUNCTION public.record_approval(text,uuid,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_approval(text,uuid,text,bigint,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
