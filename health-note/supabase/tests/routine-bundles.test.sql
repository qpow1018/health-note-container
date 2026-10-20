begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id) values ('00000000-0000-4000-c000-000000000001'),('00000000-0000-4000-c000-000000000002');
insert into public.exercises(id,user_id,name) values
('10000000-0000-4000-c000-000000000001','00000000-0000-4000-c000-000000000001','Own'),
('10000000-0000-4000-c000-000000000002','00000000-0000-4000-c000-000000000002','Other');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$select public.save_routine_bundle('11000000-0000-4000-c000-000000000001',auth.uid(),'Bundle','memo',array['10000000-0000-4000-c000-000000000001']::uuid[],null)$$,'Create bundle without schedule');
select is((select schedule from public.routines where name='Bundle'),null::jsonb,'New bundle has no schedule');
select throws_ok($$select public.save_routine_bundle(gen_random_uuid(),auth.uid(),'Empty','',array[]::uuid[],null)$$,'23514','Invalid exercises','At least one exercise required');
select throws_ok($$select public.save_routine_bundle(gen_random_uuid(),auth.uid(),'Foreign','',array['10000000-0000-4000-c000-000000000002']::uuid[],null)$$,'23503',null,'Other owner exercise rejected');
select public.save_routine('11000000-0000-4000-c000-000000000002',auth.uid(),'Legacy','{"type":"weekdays","days":[1]}','',array['10000000-0000-4000-c000-000000000001']::uuid[],null);
update public.routines set is_active=true where name='Legacy';
insert into public.routine_progress(user_id,routine_id,date,exercise_id) values(auth.uid(),'11000000-0000-4000-c000-000000000002','2026-10-20','10000000-0000-4000-c000-000000000001');
select public.save_routine_bundle('11000000-0000-4000-c000-000000000002',auth.uid(),'Edited','new memo',array['10000000-0000-4000-c000-000000000001']::uuid[],(select version from public.routines where name='Legacy'));
select is((select schedule from public.routines where name='Edited'),'{"type":"weekdays","days":[1]}'::jsonb,'Legacy schedule preserved');
select is((select count(*)::integer from public.routine_progress),1,'Legacy completion preserved');
select is(public.save_routine_bundle('11000000-0000-4000-c000-000000000002',auth.uid(),'Stale','',array['10000000-0000-4000-c000-000000000001']::uuid[],1),null::uuid,'Stale version rejected');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*)::integer from public.routines),0,'Other account cannot read bundles');
select throws_ok($$select public.save_routine_bundle(gen_random_uuid(),'00000000-0000-4000-c000-000000000001','Spoof','',array['10000000-0000-4000-c000-000000000002']::uuid[],null)$$,'P0001','Authentication required','Owner spoof rejected');
select * from finish();
rollback;
