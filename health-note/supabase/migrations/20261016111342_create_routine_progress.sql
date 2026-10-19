create table public.routine_progress (
  user_id uuid not null default auth.uid(),
  routine_id uuid not null,
  date date not null check (date between date '0001-01-01' and date '9999-12-31'),
  exercise_id uuid not null,
  primary key (user_id, routine_id, date, exercise_id),
  foreign key (user_id, routine_id) references public.routines(user_id, id) on delete cascade,
  foreign key (user_id, exercise_id) references public.exercises(user_id, id) on delete cascade
);
create index routine_progress_user_date on public.routine_progress(user_id, date);
create index routine_progress_user_exercise on public.routine_progress(user_id, exercise_id);
alter table public.routine_progress enable row level security;
revoke all on public.routine_progress from anon, authenticated;
grant select, delete on public.routine_progress to authenticated;
grant insert (user_id, routine_id, date, exercise_id) on public.routine_progress to authenticated;
create policy read_own_progress on public.routine_progress for select to authenticated
using ((select auth.uid()) = user_id);
create policy delete_own_progress on public.routine_progress for delete to authenticated
using ((select auth.uid()) = user_id);
create policy insert_own_progress on public.routine_progress for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.routine_exercises re
  where re.user_id = (select auth.uid())
    and re.routine_id = routine_progress.routine_id
    and re.exercise_id = routine_progress.exercise_id
));
-- Serialize with routine edits and exercise deletion while validating membership.
create trigger lock_progress_changes before insert or delete on public.routine_progress
for each statement execute function public.lock_exercise_changes();
