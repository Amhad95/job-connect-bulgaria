
CREATE POLICY "jpc: admin insert"
ON public.job_posting_content
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "jpc: admin update"
ON public.job_posting_content
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
