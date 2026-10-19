create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount text not null default '',
  sets integer check (sets > 0),
  youtube_links text[] not null default '{}',
  memo text not null default '',
  position bigint not null default (extract(epoch from clock_timestamp()) * 1000000)::bigint,
  version integer not null default 1 check (version > 0)
);
create index exercises_user_order on public.exercises(user_id, position, id);
alter table public.exercises enable row level security;
revoke all on public.exercises from anon, authenticated;
grant select, delete on public.exercises to authenticated;
grant insert (user_id, name, amount, sets, youtube_links, memo) on public.exercises to authenticated;
grant update (name, amount, sets, youtube_links, memo, position) on public.exercises to authenticated;

create policy own_exercises on public.exercises for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Acquire the per-user lock before any rows are locked, including direct API writes.
create function public.lock_exercise_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  end if;
  return null;
end;
$$;
create trigger lock_exercise_changes before insert or update or delete on public.exercises
for each statement execute function public.lock_exercise_changes();

create function public.version_exercise() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.name, new.amount, new.sets, new.youtube_links, new.memo)
    is distinct from (old.name, old.amount, old.sets, old.youtube_links, old.memo) then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  return new;
end;
$$;
create trigger version_exercise before update on public.exercises
for each row execute function public.version_exercise();

create function public.reorder_exercises(ordered_ids uuid[], expected_ids uuid[])
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  current_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select coalesce(array_agg(id order by position, id), '{}'::uuid[])
    into current_ids from public.exercises where user_id = auth.uid();
  if current_ids is distinct from expected_ids then return false; end if;
  if ordered_ids is null or cardinality(ordered_ids) <> cardinality(current_ids)
    or cardinality(ordered_ids) <> (select count(distinct id) from unnest(ordered_ids) id)
    or not (ordered_ids <@ current_ids) then raise exception 'Invalid exercise order'; end if;
  update public.exercises e set position = o.ordinality
    from unnest(ordered_ids) with ordinality o(id, ordinality)
    where e.id = o.id and e.user_id = auth.uid();
  return true;
end;
$$;
revoke execute on function public.lock_exercise_changes(), public.version_exercise(),
  public.reorder_exercises(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_exercises(uuid[], uuid[]) to authenticated;
