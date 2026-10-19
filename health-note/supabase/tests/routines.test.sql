begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id) values
('00000000-0000-4000-b000-000000000001'),('00000000-0000-4000-b000-000000000002');
insert into public.exercises(id,user_id,name) values
('10000000-0000-4000-b000-000000000001','00000000-0000-4000-b000-000000000001','A1'),
('10000000-0000-4000-b000-000000000002','00000000-0000-4000-b000-000000000001','A2'),
('20000000-0000-4000-b000-000000000001','00000000-0000-4000-b000-000000000002','B1');
create function pg_temp.save(rid text, title text, ids uuid[], ver integer default null,
  owner_id uuid default auth.uid()) returns uuid language sql as $$
  select public.save_routine(rid::uuid, owner_id, title, '{"type":"weekdays","days":[1,3]}', '', ids, ver);
$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-b000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.save('22000000-0000-4000-b000-000000000001','B routine',array['20000000-0000-4000-b000-000000000001']::uuid[]);
reset role;
set local role anon;
select throws_ok('select * from public.routines','42501',null,'Anonymous routine read denied');
select throws_ok('select * from public.routine_exercises','42501',null,'Anonymous links read denied');
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000001','anon',array['10000000-0000-4000-b000-000000000001']::uuid[])$$,'42501',null,'Anonymous RPC denied');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-b000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000001','A routine',array['10000000-0000-4000-b000-000000000002','10000000-0000-4000-b000-000000000001']::uuid[])$$,'Create routine and ordered links together');
select is((select count(*)::integer from public.routines),1,'Only own routines visible');
select is((select count(*)::integer from public.routine_exercises),2,'Only own links visible');
select is((select array_agg(exercise_id::text order by position) from public.routine_exercises),array['10000000-0000-4000-b000-000000000002','10000000-0000-4000-b000-000000000001'],'Selection order preserved');
select is((select is_active from public.routines),false,'New routines start inactive');
set constraints all immediate;
set constraints all deferred;
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000002','spoof',array['10000000-0000-4000-b000-000000000001']::uuid[],null,'00000000-0000-4000-b000-000000000002')$$,'P0001','Authentication required','Owner spoof rejected');
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000002','null owner',array['10000000-0000-4000-b000-000000000001']::uuid[],null,null)$$,'P0001','Authentication required','Null owner rejected');
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000002','foreign exercise',array['20000000-0000-4000-b000-000000000001']::uuid[])$$,'23503',null,'Cannot link another user exercise');
select is((select count(*)::integer from public.routines),1,'Failed link rolls back parent insert');
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000002','duplicate',array['10000000-0000-4000-b000-000000000001','10000000-0000-4000-b000-000000000001']::uuid[])$$,'23514','Invalid exercises','Duplicate exercises rejected');
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000002','empty','{}'::uuid[])$$,'23514','Invalid exercises','Empty exercises rejected');
select throws_ok($$update public.routines set user_id='00000000-0000-4000-b000-000000000002'$$,'42501',null,'Cannot reassign owner');
with changed as (update public.routines set name='wrong' where id='22000000-0000-4000-b000-000000000001' returning id)
select is((select count(*)::integer from changed),0,'Cannot update another user routine');
with changed as (delete from public.routines where id='22000000-0000-4000-b000-000000000001' returning id)
select is((select count(*)::integer from changed),0,'Cannot delete another user routine');
select throws_ok($$insert into public.routine_exercises(routine_id,exercise_id,position) values ('22000000-0000-4000-b000-000000000001','10000000-0000-4000-b000-000000000001',3)$$,'23503',null,'Cannot attach own exercise to another user routine');
select throws_ok($$delete from public.exercises where id='10000000-0000-4000-b000-000000000001'$$,'23503',null,'Referenced exercise deletion blocked by DB');
select throws_ok($$do $test$ begin delete from public.routine_exercises; set constraints all immediate; end $test$;$$,'23514','A routine requires at least one exercise','Direct API cannot empty a routine');
select throws_ok($$update public.routines set schedule='{"type":"weekdays","days":[7]}'$$,'23514',null,'Out of range weekday rejected');
select throws_ok($$update public.routines set schedule='{"type":"weekdays","days":[1,1]}'$$,'23514',null,'Duplicate weekday rejected');
select throws_ok($$update public.routines set schedule='{"type":"interval","startDate":"2026-02-30","intervalDays":2}'$$,'23514',null,'Impossible date rejected');
select throws_ok($$update public.routines set schedule='{"type":"interval","startDate":"2026-10-14","intervalDays":0}'$$,'23514',null,'Zero interval rejected');
select throws_ok($$update public.routines set schedule='{"type":"interval","startDate":"2026-10-14","intervalDays":2,"postponedDates":["2026-10-15"]}'$$,'23514',null,'Non-scheduled postponement rejected');
select throws_ok($$update public.routines set schedule='{"type":"interval","startDate":"2026-10-14","intervalDays":2,"postponedDates":[null]}'$$,'23514',null,'Null postponement rejected');
select set_config('test.routine_version',(select version::text from public.routines),true);
select throws_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000001','lost edit',array['20000000-0000-4000-b000-000000000001']::uuid[],current_setting('test.routine_version')::integer)$$,'23503',null,'Failed edit rolls back parent and links');
select is((select name from public.routines),'A routine','Failed edit preserves original name');
select is((select count(*)::integer from public.routine_exercises),2,'Failed edit preserves original links');
select is((select version::text from public.routines),current_setting('test.routine_version'),'Failed edit preserves version');
select lives_ok($$select pg_temp.save('11000000-0000-4000-b000-000000000001','A edited',array['10000000-0000-4000-b000-000000000001']::uuid[],current_setting('test.routine_version')::integer)$$,'Valid edit succeeds');
select is((select count(*)::integer from public.routine_exercises),1,'Edit replaces links');
select is(pg_temp.save('11000000-0000-4000-b000-000000000001','stale',array['10000000-0000-4000-b000-000000000001']::uuid[],current_setting('test.routine_version')::integer),null::uuid,'Stale edit rejected');
update public.routines set is_active=true where is_active=false;
with changed as (update public.routines set is_active=true where is_active=false returning id)
select is((select count(*)::integer from changed),0,'Stale activation rejected');
select lives_ok($$update public.routines set schedule='{"type":"interval","startDate":"2026-10-14","intervalDays":2,"postponedDates":["2026-10-16","2026-10-17"]}'$$,'Valid sequential postponements accepted');
select pg_temp.save('11000000-0000-4000-b000-000000000002','A second',array['10000000-0000-4000-b000-000000000002']::uuid[]);
select set_config('test.routine_version',(select version::text from public.routines where id='11000000-0000-4000-b000-000000000001'),true);
select is(public.reorder_routines(array['11000000-0000-4000-b000-000000000002','11000000-0000-4000-b000-000000000001']::uuid[],array['11000000-0000-4000-b000-000000000001','11000000-0000-4000-b000-000000000002']::uuid[]),true,'Reorder succeeds');
select is((select array_agg(name order by position,id) from public.routines),array['A second','A edited'],'Reorder persisted');
select is((select version::text from public.routines where id='11000000-0000-4000-b000-000000000001'),current_setting('test.routine_version'),'Reorder preserves content version');
select is(public.reorder_routines(array['11000000-0000-4000-b000-000000000001','11000000-0000-4000-b000-000000000002']::uuid[],array['11000000-0000-4000-b000-000000000001','11000000-0000-4000-b000-000000000002']::uuid[]),false,'Stale reorder rejected');
select throws_ok($$select public.reorder_routines(array['11000000-0000-4000-b000-000000000002','11000000-0000-4000-b000-000000000002']::uuid[],array['11000000-0000-4000-b000-000000000002','11000000-0000-4000-b000-000000000001']::uuid[])$$,'P0001','Invalid routine order','Invalid reorder rejected');
select lives_ok($$delete from public.routines where id='11000000-0000-4000-b000-000000000001'$$,'Routine deletion succeeds');
select lives_ok($$delete from public.exercises where id='10000000-0000-4000-b000-000000000001'$$,'Exercise becomes deletable after routine deletion');
set constraints all immediate;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-b000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select is((select name from public.routines),'B routine','Other user data unchanged');
select * from finish();
rollback;
