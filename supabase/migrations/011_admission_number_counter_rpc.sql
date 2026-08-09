create or replace function public.next_admission_number_counter(
  p_school_id uuid,
  p_academic_year_id uuid
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.admission_number_counters (school_id, academic_year_id, last_number)
  values (p_school_id, p_academic_year_id, 1)
  on conflict (school_id, academic_year_id)
  do update set
    last_number = public.admission_number_counters.last_number + 1,
    updated_at = now()
  returning last_number;
$$;

revoke all on function public.next_admission_number_counter(uuid, uuid) from public;
 grant execute on function public.next_admission_number_counter(uuid, uuid) to service_role;
