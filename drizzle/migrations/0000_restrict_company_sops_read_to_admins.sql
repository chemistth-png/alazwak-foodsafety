DROP POLICY IF EXISTS "Authenticated can read company_sops" ON public.company_sops;
DROP POLICY IF EXISTS "Company SOPs readable by authenticated" ON public.company_sops;
CREATE POLICY "Admins can read company_sops"
ON public.company_sops
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));