-- Draft only: not applied to the local or hosted database.
-- New installations only. Existing browser data is deliberately not imported.
create function public.is_valid_routine_schedule(schedule jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  item jsonb;
  anchor date;
  postponed date;
  interval_days integer;
  days integer[];
begin
  if schedule->>'type' = 'weekdays' then
    if jsonb_typeof(schedule->'days') is distinct from 'array' then return false; end if;
    select array_agg(value::integer) into days from jsonb_array_elements_text(schedule->'days');
    return coalesce(cardinality(days) > 0 and days <@ array[0,1,2,3,4,5,6]
      and cardinality(days) = (select count(distinct d) from unnest(days) d), false);
  end if;
  if schedule->>'type' is distinct from 'interval' then return false; end if;
  if (schedule->>'startDate') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  anchor := (schedule->>'startDate')::date;
  interval_days := (schedule->>'intervalDays')::integer;
  if anchor is null or anchor < date '0001-01-01' or anchor > date '9999-12-31'
    or interval_days is null or interval_days < 1 then return false; end if;
  for item in select value from jsonb_array_elements(coalesce(schedule->'postponedDates', '[]'::jsonb)) loop
    if (item #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
    postponed := (item #>> '{}')::date;
    if postponed is null or postponed < anchor or postponed >= date '9999-12-31'
      or (postponed - anchor) % interval_days <> 0 then return false; end if;
    anchor := postponed + 1;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount text not null default '',
  sets integer check (sets > 0),
  youtube_links text[] not null default '{}',
  memo text not null default '',
  position bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint,
  version integer not null default 1,
  unique (user_id, id)
);
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  schedule jsonb not null check (public.is_valid_routine_schedule(schedule)),
  is_active boolean not null default false,
  memo text not null default '',
  position bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint,
  version integer not null default 1,
  unique (user_id, id)
);
create table public.routine_exercises (
  user_id uuid not null default auth.uid(),
  routine_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position >= 0),
  primary key (routine_id, exercise_id),
  unique (user_id, routine_id, exercise_id),
  foreign key (user_id, routine_id) references public.routines(user_id, id) on delete cascade,
  foreign key (user_id, exercise_id) references public.exercises(user_id, id) on delete restrict
);
create table public.routine_completions (
  user_id uuid not null default auth.uid(),
  routine_id uuid not null,
  exercise_id uuid not null,
  date date not null check (date between date '0001-01-01' and date '9999-12-31'),
  primary key (routine_id, exercise_id, date),
  foreign key (user_id, routine_id, exercise_id)
    references public.routine_exercises(user_id, routine_id, exercise_id) on delete cascade
);
create index exercises_user_order on public.exercises(user_id, position, id);
create index routines_user_order on public.routines(user_id, position, id);
create index routine_exercises_owner_exercise on public.routine_exercises(user_id, exercise_id);
create index routine_completions_owner_date on public.routine_completions(user_id, date);

create function public.increment_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;
create trigger exercise_version before update on public.exercises
for each row execute function public.increment_version();
create trigger routine_version before update on public.routines
for each row execute function public.increment_version();

alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_completions enable row level security;
revoke all on public.exercises, public.routines, public.routine_exercises, public.routine_completions from anon, authenticated;
grant select, insert, update, delete on public.exercises, public.routines, public.routine_exercises, public.routine_completions to authenticated;

create policy own_exercises on public.exercises for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_routines on public.routines for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_routine_exercises on public.routine_exercises for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_completions on public.routine_completions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- One transaction saves both the routine and its exercise links.
-- An outdated version returns null without writing anything.
create function public.save_routine(
  routine_id uuid, expected_version integer, routine_name text,
  routine_memo text, routine_schedule jsonb, exercise_ids uuid[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if cardinality(exercise_ids) is null or cardinality(exercise_ids) = 0
    or cardinality(exercise_ids) <> (select count(distinct id) from unnest(exercise_ids) id)
    then raise exception 'Select distinct exercises'; end if;
  if routine_id is null then
    insert into public.routines(name, memo, schedule)
    values (routine_name, routine_memo, routine_schedule) returning id into saved_id;
  else
    update public.routines set name = routine_name, memo = routine_memo, schedule = routine_schedule
    where id = routine_id and version = expected_version returning id into saved_id;
    if saved_id is null then return null; end if;
  end if;
  delete from public.routine_exercises re
    where re.routine_id = saved_id and not (re.exercise_id = any(exercise_ids));
  insert into public.routine_exercises(routine_id, exercise_id, position)
    select saved_id, id, (ordinality - 1)::integer from unnest(exercise_ids) with ordinality as e(id, ordinality)
    on conflict (routine_id, exercise_id) do update set position = excluded.position;
  return saved_id;
end;
$$;

-- The complete order is saved atomically; a changed list returns false.
create function public.reorder_items(kind text, ordered_ids uuid[], expected_ids uuid[])
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  current_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if kind not in ('exercises', 'routines') then raise exception 'Invalid collection'; end if;
  execute format('select coalesce(array_agg(id order by position, id), ''{}''::uuid[]) from (select id, position from public.%I where user_id = $1 for update) items', kind)
    into current_ids using auth.uid();
  if current_ids is distinct from expected_ids then return false; end if;
  if ordered_ids is null or cardinality(ordered_ids) <> cardinality(current_ids)
    or cardinality(ordered_ids) <> (select count(distinct id) from unnest(ordered_ids) id)
    or not (ordered_ids <@ current_ids) then raise exception 'Invalid order'; end if;
  execute format('update public.%I t set position = o.ordinality from unnest($1) with ordinality o(id, ordinality) where t.id = o.id and t.user_id = $2', kind)
    using ordered_ids, auth.uid();
  return true;
end;
$$;

revoke execute on function public.is_valid_routine_schedule(jsonb), public.increment_version(),
  public.save_routine(uuid, integer, text, text, jsonb, uuid[]),
  public.reorder_items(text, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.is_valid_routine_schedule(jsonb),
  public.save_routine(uuid, integer, text, text, jsonb, uuid[]),
  public.reorder_items(text, uuid[], uuid[]) to authenticated;
