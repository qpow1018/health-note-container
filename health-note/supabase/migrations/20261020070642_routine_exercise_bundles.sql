-- Keep legacy schedule/activation data for existing records and older clients.
-- New exercise bundles do not require or modify either setting.
alter table public.routines alter column schedule drop not null;
alter table public.routines drop constraint routines_schedule_check;
alter table public.routines add constraint routines_schedule_check
  check (schedule is null or public.is_valid_routine_schedule(schedule) is true);

create function public.save_routine_bundle(
  routine_id uuid, owner_id uuid, routine_name text,
  routine_memo text, exercise_ids uuid[], expected_version integer
) returns uuid language sql security invoker set search_path = '' as $$
  select public.save_routine(
    routine_id, owner_id, routine_name,
    (select r.schedule from public.routines r where r.id = routine_id),
    routine_memo, exercise_ids, expected_version
  );
$$;
revoke execute on function public.save_routine_bundle(uuid, uuid, text, text, uuid[], integer)
  from public, anon, authenticated;
grant execute on function public.save_routine_bundle(uuid, uuid, text, text, uuid[], integer)
  to authenticated;
