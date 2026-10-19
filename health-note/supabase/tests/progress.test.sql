begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id) values
('00000000-0000-4000-c000-000000000001'),('00000000-0000-4000-c000-000000000002');
insert into public.exercises(id,user_id,name) values
('10000000-0000-4000-c000-000000000001','00000000-0000-4000-c000-000000000001','A1'),
('10000000-0000-4000-c000-000000000002','00000000-0000-4000-c000-000000000001','A2'),
('10000000-0000-4000-c000-000000000003','00000000-0000-4000-c000-000000000001','A unlinked'),
('20000000-0000-4000-c000-000000000001','00000000-0000-4000-c000-000000000002','B1');
create function pg_temp.mark(rid uuid, eid uuid, day date default '2026-10-16', owner_id uuid default auth.uid())
returns void language sql as $$
  insert into public.routine_progress(user_id,routine_id,date,exercise_id) values(owner_id,rid,day,eid)
  on conflict(user_id,routine_id,date,exercise_id) do nothing;
$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select public.save_routine('22000000-0000-4000-c000-000000000001',auth.uid(),'B routine','{"type":"weekdays","days":[5]}','',array['20000000-0000-4000-c000-000000000001']::uuid[],null);
select pg_temp.mark('22000000-0000-4000-c000-000000000001','20000000-0000-4000-c000-000000000001');
reset role;
set local role anon;
select throws_ok('select * from public.routine_progress','42501',null,'Anonymous read denied');
select throws_ok($$select pg_temp.mark('22000000-0000-4000-c000-000000000001','20000000-0000-4000-c000-000000000001')$$,'42501',null,'Anonymous completion denied');
select throws_ok('delete from public.routine_progress','42501',null,'Anonymous uncheck denied');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_routine('11000000-0000-4000-c000-000000000001',auth.uid(),'A routine','{"type":"weekdays","days":[5]}','',array['10000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000002']::uuid[],null);
select public.save_routine('11000000-0000-4000-c000-000000000002',auth.uid(),'A second','{"type":"weekdays","days":[5]}','',array['10000000-0000-4000-c000-000000000001']::uuid[],null);
select is((select count(*)::integer from public.routine_progress),0,'A cannot read B progress');
select lives_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001')$$,'Own linked exercise can be completed');
select lives_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001')$$,'Duplicate completion is idempotent');
select is((select count(*)::integer from public.routine_progress),1,'Duplicate creates one row');
select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000002');
select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001','2026-10-17');
select pg_temp.mark('11000000-0000-4000-c000-000000000002','10000000-0000-4000-c000-000000000001');
select is((select count(*)::integer from public.routine_progress),4,'Exercises dates and routines are stored independently');
select is((select count(*)::integer from public.routine_progress where date='2026-10-16'),3,'Date filtering isolates today');
select throws_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000003')$$,'42501',null,'Cannot complete an unlinked own exercise');
select throws_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','20000000-0000-4000-c000-000000000001')$$,'42501',null,'Cannot complete another user exercise');
select throws_ok($$select pg_temp.mark('22000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001')$$,'42501',null,'Cannot complete another user routine');
select throws_ok($$select pg_temp.mark('22000000-0000-4000-c000-000000000001','20000000-0000-4000-c000-000000000001','2026-10-16','00000000-0000-4000-c000-000000000002')$$,'42501',null,'Owner spoof rejected');
select throws_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001','2026-02-30')$$,'22008',null,'Impossible date rejected');
select throws_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001','10000-01-01')$$,'23514',null,'Out of range date rejected');
select throws_ok($$update public.routine_progress set user_id='00000000-0000-4000-c000-000000000002'$$,'42501',null,'Updates and reassignment denied');
with changed as (delete from public.routine_progress where routine_id='22000000-0000-4000-c000-000000000001' returning *)
select is((select count(*)::integer from changed),0,'Cannot uncheck another user progress');
select lives_ok($$delete from public.routine_progress where routine_id='11000000-0000-4000-c000-000000000001' and date='2026-10-16' and exercise_id='10000000-0000-4000-c000-000000000001'$$,'Uncheck removes one completion');
select is((select count(*)::integer from public.routine_progress),3,'Uncheck preserves other exercises dates and routines');
select lives_ok($$delete from public.routine_progress where routine_id='11000000-0000-4000-c000-000000000001' and date='2026-10-16' and exercise_id='10000000-0000-4000-c000-000000000001'$$,'Repeated uncheck succeeds');
select public.save_routine('11000000-0000-4000-c000-000000000001',auth.uid(),'Renamed','{"type":"weekdays","days":[5]}','',array['10000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000002']::uuid[],(select version from public.routines where id='11000000-0000-4000-c000-000000000001'));
select is((select count(*)::integer from public.routine_progress),3,'Routine edit and link replacement preserve completions');
select public.save_routine('11000000-0000-4000-c000-000000000001',auth.uid(),'Unlinked A1','{"type":"weekdays","days":[5]}','',array['10000000-0000-4000-c000-000000000002']::uuid[],(select version from public.routines where id='11000000-0000-4000-c000-000000000001'));
select is((select count(*)::integer from public.routine_progress),3,'Unlinking does not erase historical completion');
select throws_ok($$select pg_temp.mark('11000000-0000-4000-c000-000000000001','10000000-0000-4000-c000-000000000001')$$,'42501',null,'No new completion after unlinking');
delete from public.routines where id='11000000-0000-4000-c000-000000000002';
select is((select count(*)::integer from public.routine_progress),2,'Routine deletion removes only its completions');
delete from public.exercises where id='10000000-0000-4000-c000-000000000001';
select is((select count(*)::integer from public.routine_progress),1,'Exercise deletion removes only its completions');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*)::integer from public.routine_progress),1,'Other user progress unchanged');
select * from finish();
rollback;
