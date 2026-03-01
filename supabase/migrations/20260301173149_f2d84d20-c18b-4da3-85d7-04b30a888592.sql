CREATE OR REPLACE FUNCTION public.get_employer_owner_email(p_employer_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT u.email
  FROM employer_profiles ep
  JOIN auth.users u ON u.id = ep.user_id
  WHERE ep.employer_id = p_employer_id AND ep.role = 'owner'
  LIMIT 1;
$$;