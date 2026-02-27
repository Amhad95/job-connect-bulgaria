-- Allow authenticated users (admins) to update job postings (approval_status, status, etc.)
CREATE POLICY "Authenticated users can update job_postings"
ON public.job_postings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also allow insert for crawl operations via authenticated users
CREATE POLICY "Authenticated users can insert job_postings"
ON public.job_postings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update employers (admin edits)
CREATE POLICY "Authenticated users can update employers"
ON public.employers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert employers
CREATE POLICY "Authenticated users can insert employers"
ON public.employers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete employers
CREATE POLICY "Authenticated users can delete employers"
ON public.employers
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to update employer_sources
CREATE POLICY "Authenticated users can update employer_sources"
ON public.employer_sources
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert employer_sources
CREATE POLICY "Authenticated users can insert employer_sources"
ON public.employer_sources
FOR INSERT
TO authenticated
WITH CHECK (true);