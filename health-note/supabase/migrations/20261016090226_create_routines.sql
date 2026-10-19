create function public.is_valid_routine_schedule(schedule jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  anchor date;
  postponed date;
  date_text text;
  interval_days numeric;
begin
  if schedule->>'type' = 'weekdays' then
    return jsonb_typeof(schedule->'days') = 'array'
      and jsonb_array_length(schedule->'days') between 1 and 7
      and not exists (select 1 from jsonb_array_elements(schedule->'days') day
        where jsonb_typeof(day) <> 'number' or day::text !~ '^[0-6]$')
      and (select count(*) = count(distinct day) from jsonb_array_elements(schedule->'days') day);
  end if;
  if schedule->>'type' is distinct from 'interval'
    or jsonb_typeof(schedule->'intervalDays') is distinct from 'number'
    or schedule->>'intervalDays' !~ '^[0-9]+$'
    or jsonb_typeof(schedule->'startDate') is distinct from 'string'
    or schedule->>'startDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
  interval_days := (schedule->>'intervalDays')::numeric;
  if interval_days < 1 or interval_days > 9007199254740991 then return false; end if;
  anchor := (schedule->>'startDate')::date;
  if anchor < date '0001-01-01' then return false; end if;
  if schedule ? 'postponedDates' then
    if jsonb_typeof(schedule->'postponedDates') <> 'array' then return false; end if;
    if exists (select 1 from jsonb_array_elements(schedule->'postponedDates') value
      where jsonb_typeof(value) <> 'string') then return false; end if;
    for date_text in select jsonb_array_elements_text(schedule->'postponedDates') loop
      if date_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
      postponed := date_text::date;
      if postponed < anchor or postponed >= date '9999-12-31'
        or mod((postponed - anchor)::numeric, interval_days) <> 0 then return false; end if;
      anchor := postponed + 1;
    end loop;
  end if;
  return true;
exception when others then return false;
end;
$$;

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  schedule jsonb not null check (public.is_valid_routine_schedule(schedule) is true),
  memo text not null default '',
  is_active boolean not null default false,
  position bigint not null default (extract(epoch from clock_timestamp()) * 1000000)::bigint,
  version integer not null default 1 check (version > 0),
  unique (user_id, id)
);
create index routines_user_order on public.routines(user_id, position, id);
alter table public.exercises add constraint exercises_user_id_id_key unique (user_id, id);
create table public.routine_exercises (
  user_id uuid not null default auth.uid(),
  routine_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position > 0),
  primary key (routine_id, exercise_id),
  unique (routine_id, position),
  foreign key (user_id, routine_id) references public.routines(user_id, id) on delete cascade,
  foreign key (user_id, exercise_id) references public.exercises(user_id, id) on delete restrict
);
create index routine_exercises_user_exercise on public.routine_exercises(user_id, exercise_id);
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
create policy own_routines on public.routines for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_routine_exercises on public.routine_exercises for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.routines, public.routine_exercises from anon, authenticated;
grant select, delete on public.routines, public.routine_exercises to authenticated;
grant insert (id, user_id, name, schedule, memo) on public.routines to authenticated;
grant update (name, schedule, memo, is_active, position) on public.routines to authenticated;
grant insert (user_id, routine_id, exercise_id, position) on public.routine_exercises to authenticated;

-- Share the exercise lock so linking and deleting an exercise cannot race.
create trigger lock_routine_changes before insert or update or delete on public.routines
for each statement execute function public.lock_exercise_changes();
create trigger lock_routine_exercise_changes before insert or update or delete on public.routine_exercises
for each statement execute function public.lock_exercise_changes();
create function public.version_routine() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;
create trigger version_routine before update of name, schedule, memo, is_active on public.routines
for each row execute function public.version_routine();
create function public.touch_routine_exercises() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.routines set name = name where id = coalesce(new.routine_id, old.routine_id);
  return null;
end;
$$;
create trigger touch_routine_exercises after insert or delete on public.routine_exercises
for each row execute function public.touch_routine_exercises();

-- A save replaces links inside one transaction; only the final state must be nonempty.
create function public.require_routine_exercise() returns trigger
language plpgsql set search_path = '' as $$
declare target_id uuid;
begin
  if tg_table_name = 'routines' then target_id := new.id;
  else target_id := old.routine_id; end if;
  if exists (select 1 from public.routines where id = target_id)
    and not exists (select 1 from public.routine_exercises where routine_id = target_id) then
    raise exception 'A routine requires at least one exercise' using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger require_routine_exercise after insert on public.routines
  deferrable initially deferred for each row execute function public.require_routine_exercise();
create constraint trigger require_routine_exercise after delete on public.routine_exercises
  deferrable initially deferred for each row execute function public.require_routine_exercise();

create function public.save_routine(
  routine_id uuid, owner_id uuid, routine_name text, routine_schedule jsonb,
  routine_memo text, exercise_ids uuid[], expected_version integer
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  if auth.uid() is null or auth.uid() is distinct from owner_id then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exercise_ids is null or cardinality(exercise_ids) = 0
    or cardinality(exercise_ids) <> (select count(distinct id) from unnest(exercise_ids) id) then
    raise exception 'Invalid exercises' using errcode = '23514';
  end if;
  if expected_version is null then
    insert into public.routines(id, user_id, name, schedule, memo)
      values (routine_id, owner_id, routine_name, routine_schedule, routine_memo) returning id into saved_id;
  else
    update public.routines set name = routine_name, schedule = routine_schedule, memo = routine_memo
      where id = routine_id and version = expected_version returning id into saved_id;
    if saved_id is null then return null; end if;
    delete from public.routine_exercises re where re.routine_id = saved_id;
  end if;
  insert into public.routine_exercises(user_id, routine_id, exercise_id, position)
    select owner_id, saved_id, id, ordinality from unnest(exercise_ids) with ordinality e(id, ordinality);
  return saved_id;
end;
$$;
create function public.reorder_routines(ordered_ids uuid[], expected_ids uuid[])
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select coalesce(array_agg(id order by position, id), '{}'::uuid[]) into current_ids
    from public.routines where user_id = auth.uid();
  if current_ids is distinct from expected_ids then return false; end if;
  if ordered_ids is null or cardinality(ordered_ids) <> cardinality(current_ids)
    or cardinality(ordered_ids) <> (select count(distinct id) from unnest(ordered_ids) id)
    or not (ordered_ids <@ current_ids) then raise exception 'Invalid routine order'; end if;
  update public.routines r set position = o.ordinality
    from unnest(ordered_ids) with ordinality o(id, ordinality)
    where r.id = o.id and r.user_id = auth.uid();
  return true;
end;
$$;
revoke execute on function public.is_valid_routine_schedule(jsonb), public.version_routine(),
  public.touch_routine_exercises(), public.require_routine_exercise(),
  public.save_routine(uuid, uuid, text, jsonb, text, uuid[], integer),
  public.reorder_routines(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.is_valid_routine_schedule(jsonb),
  public.save_routine(uuid, uuid, text, jsonb, text, uuid[], integer),
  public.reorder_routines(uuid[], uuid[]) to authenticated;
