create table public.plans (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null check (start_date between date '0001-01-01' and date '9999-09-22'),
  time_zone text not null,
  duration integer not null check (duration in (14, 30, 100)),
  status text not null default 'active' check (status in ('active', 'completed', 'stopped')),
  target_xp integer not null default 9000 check (target_xp = 9000),
  exercise_day_count integer not null check (exercise_day_count between 1 and duration),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);
create unique index plans_one_active_per_user on public.plans(user_id) where status = 'active';

create table public.plan_weekdays (
  user_id uuid not null default auth.uid(),
  plan_id uuid not null,
  weekday integer not null check (weekday between 0 and 6),
  routine_id uuid,
  primary key (plan_id, weekday),
  foreign key (user_id, plan_id) references public.plans(user_id, id) on delete cascade,
  foreign key (user_id, routine_id) references public.routines(user_id, id) on delete set null (routine_id)
);
create index plan_weekdays_user_routine on public.plan_weekdays(user_id, routine_id);

alter table public.plans enable row level security;
alter table public.plan_weekdays enable row level security;
create policy own_plans on public.plans for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_plan_weekdays on public.plan_weekdays for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.plans, public.plan_weekdays from anon, authenticated;
grant select on public.plans, public.plan_weekdays to authenticated;
grant insert (id, start_date, time_zone, duration, exercise_day_count) on public.plans to authenticated;
grant insert (plan_id, weekday, routine_id) on public.plan_weekdays to authenticated;

-- Serialize with existing routine/exercise writes, including routine deletion.
create trigger lock_plan_changes before insert or update or delete on public.plans
for each statement execute function public.lock_exercise_changes();
create trigger lock_plan_weekday_changes before insert or update or delete on public.plan_weekdays
for each statement execute function public.lock_exercise_changes();

create function public.validate_plan_start() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone)
    or new.start_date is distinct from (clock_timestamp() at time zone new.time_zone)::date then
    raise exception 'Invalid plan start date or time zone' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_plan_start before insert on public.plans
for each row execute function public.validate_plan_start();

-- Even direct Data API inserts must provide a complete, consistent weekly schedule.
create function public.require_plan_schedule() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  target_id uuid;
  plan public.plans;
  actual_days integer;
begin
  if tg_table_name = 'plans' then target_id := new.id;
  else target_id := coalesce(new.plan_id, old.plan_id); end if;
  select * into plan from public.plans where id = target_id;
  if not found or plan.status <> 'active' then return null; end if;
  if exists (select 1 from public.plan_weekdays where plan_id = target_id and routine_id is null) then
    raise exception 'A scheduled day requires a routine' using errcode = '23514';
  end if;
  select count(*)::integer into actual_days
  from generate_series(0, plan.duration - 1) offset_day
  where exists (
    select 1 from public.plan_weekdays w
    where w.plan_id = target_id
      and w.weekday = extract(dow from (plan.start_date + offset_day))::integer
  );
  if actual_days = 0 or actual_days <> plan.exercise_day_count then
    raise exception 'Invalid plan exercise day count' using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger require_plan_schedule after insert or update on public.plans
deferrable initially deferred for each row execute function public.require_plan_schedule();
create constraint trigger require_plan_weekday_schedule after insert or update or delete on public.plan_weekdays
deferrable initially deferred for each row execute function public.require_plan_schedule();

create function public.prevent_active_plan_routine_delete() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists (
    select 1 from public.plan_weekdays w join public.plans p on p.id = w.plan_id
    where w.user_id = old.user_id and w.routine_id = old.id and p.status = 'active'
  ) then
    raise exception 'Routine is used by an active plan' using errcode = 'PT409';
  end if;
  return old;
end;
$$;
create trigger prevent_active_plan_routine_delete before delete on public.routines
for each row execute function public.prevent_active_plan_routine_delete();

create function public.create_plan(
  plan_id uuid, plan_start_date date, plan_time_zone text,
  plan_duration integer, scheduled_weekdays integer[], routine_ids uuid[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  active_id uuid;
  total_days integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select id into active_id from public.plans where user_id = auth.uid() and status = 'active';
  -- A retry after a lost response returns the same plan; a different request cannot replace it.
  if active_id = plan_id then return active_id; end if;
  if active_id is not null then return null; end if;
  if plan_id is null or plan_duration is null or plan_duration not in (14, 30, 100)
    or plan_start_date is null or plan_time_zone is null
    or scheduled_weekdays is null or routine_ids is null
    or cardinality(scheduled_weekdays) not between 1 and 7
    or cardinality(scheduled_weekdays) <> cardinality(routine_ids)
    or cardinality(scheduled_weekdays) <> (select count(distinct day) from unnest(scheduled_weekdays) day)
    or exists (select 1 from unnest(scheduled_weekdays) day where day is null or day not between 0 and 6)
    or exists (select 1 from unnest(routine_ids) id where id is null) then
    raise exception 'Invalid plan settings' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(routine_ids) selected(routine_id)
    where not exists (select 1 from public.routines r where r.id = selected.routine_id and r.user_id = auth.uid())
  ) then
    raise exception 'A selected routine is unavailable' using errcode = '23503';
  end if;
  select count(*)::integer into total_days
  from generate_series(0, plan_duration - 1) offset_day
  where extract(dow from (plan_start_date + offset_day))::integer = any(scheduled_weekdays);
  insert into public.plans(id, start_date, time_zone, duration, exercise_day_count)
    values (plan_id, plan_start_date, plan_time_zone, plan_duration, total_days);
  insert into public.plan_weekdays(plan_id, weekday, routine_id)
    select plan_id, day, routine_id from unnest(scheduled_weekdays, routine_ids) schedule(day, routine_id);
  return plan_id;
end;
$$;
revoke execute on function public.validate_plan_start(), public.require_plan_schedule(),
  public.prevent_active_plan_routine_delete(),
  public.create_plan(uuid, date, text, integer, integer[], uuid[]) from public, anon, authenticated;
grant execute on function public.create_plan(uuid, date, text, integer, integer[], uuid[]) to authenticated;
