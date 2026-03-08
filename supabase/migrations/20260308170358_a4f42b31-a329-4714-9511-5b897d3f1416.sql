-- job_api_sources: admin full access
CREATE POLICY "Admins can manage api sources"
  ON public.job_api_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- job_import_runs: admin read
CREATE POLICY "Admins can view import runs"
  ON public.job_import_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- job_import_items: admin read
CREATE POLICY "Admins can view import items"
  ON public.job_import_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));