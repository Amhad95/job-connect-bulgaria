-- Migration: 20260304000004_milestone6_fix_missing_seat_count.sql
-- Fixes missing get_employer_active_seat_count function which was omitted from M5.

create or replace function get_employer_active_seat_count(p_employer_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from employer_profiles
  where employer_id = p_employer_id;
$$;

grant execute on function get_employer_active_seat_count(uuid) to authenticated, anon;
