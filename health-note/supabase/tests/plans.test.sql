begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id) values
('00000000-0000-4000-c000-000000000001'), ('00000000-0000-4000-c000-000000000002');
insert into public.exercises(id,user_id,name) values
('10000000-0000-4000-c000-000000000001','00000000-0000-4000-c000-000000000001','Own'),
('10000000-0000-4000-c000-000000000002','00000000-0000-4000-c000-000000000002','Other');

-- Force deferred schedule checks inside each assertion, then restore routine-save semantics.
create function pg_temp.start_plan(pid uuid, days integer[], ids uuid[], duration integer default 14)
returns uuid language plpgsql as $$
declare result uuid;
begin
  result := public.create_plan(pid, (clock_timestamp() at time zone 'UTC')::date, 'UTC', duration, days, ids);
  set constraints require_plan_schedule, require_plan_weekday_schedule immediate;
  set constraints require_plan_schedule, require_plan_weekday_schedule deferred;
  return result;
end;
$$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select public.save_routine_bundle('11000000-0000-4000-c000-000000000002',auth.uid(),'Other routine','',array['10000000-0000-4000-c000-000000000002']::uuid[],null);
select pg_temp.start_plan('12000000-0000-4000-c000-000000000002',array[0],array['11000000-0000-4000-c000-000000000002']::uuid[]);
reset role;
set local role anon;
select throws_ok('select * from public.plans','42501',null,'Anonymous plan reads denied');
select throws_ok('select * from public.plan_weekdays','42501',null,'Anonymous schedule reads denied');
select throws_ok($$select public.create_plan(gen_random_uuid(),current_date,'UTC',14,array[1],array['11000000-0000-4000-c000-000000000002']::uuid[])$$,'42501',null,'Anonymous RPC denied');
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-c000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_routine_bundle('11000000-0000-4000-c000-000000000001',auth.uid(),'Own routine','',array['10000000-0000-4000-c000-000000000001']::uuid[],null);
select is((select count(*)::integer from public.plans),0,'Other account plan hidden');
select is((select count(*)::integer from public.plan_weekdays),0,'Other account schedule hidden');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[]::integer[],array[]::uuid[])$$,'23514','Invalid plan settings','Empty week rejected');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[1,1],array['11000000-0000-4000-c000-000000000001','11000000-0000-4000-c000-000000000001']::uuid[])$$,'23514','Invalid plan settings','Duplicate weekday rejected');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[7],array['11000000-0000-4000-c000-000000000001']::uuid[])$$,'23514','Invalid plan settings','Out of range weekday rejected');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[1],array[]::uuid[])$$,'23514','Invalid plan settings','Mismatched routine list rejected');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[1],array['11000000-0000-4000-c000-000000000001']::uuid[],15)$$,'23514','Invalid plan settings','Unsupported period rejected');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[1],array['11000000-0000-4000-c000-000000000002']::uuid[])$$,'23503','A selected routine is unavailable','Other account routine rejected');
select throws_ok($$select pg_temp.start_plan(gen_random_uuid(),array[1],array[gen_random_uuid()])$$,'23503','A selected routine is unavailable','Missing routine rejected');
select throws_ok($$select public.create_plan(gen_random_uuid(),current_date - 2,'UTC',14,array[1],array['11000000-0000-4000-c000-000000000001']::uuid[])$$,'23514','Invalid plan start date or time zone','Backdated start rejected');
select throws_ok($$select public.create_plan(gen_random_uuid(),current_date,'invalid-zone',14,array[1],array['11000000-0000-4000-c000-000000000001']::uuid[])$$,'23514','Invalid plan start date or time zone','Unknown time zone rejected');
select is((select count(*)::integer from public.plans),0,'Failed starts leave no partial plan');
select is((select count(*)::integer from public.plan_weekdays),0,'Failed starts leave no partial weekdays');

select lives_ok($$
do $body$ begin
  perform pg_temp.start_plan('12000000-0000-4000-c000-000000000001',array[1,3,5],
    array['11000000-0000-4000-c000-000000000001','11000000-0000-4000-c000-000000000001','11000000-0000-4000-c000-000000000001']::uuid[]);
end $body$;
$$,'Create plan and reuse one routine on three weekdays');
select is((select exercise_day_count from public.plans),6,'14 days with three weekdays yields six exercise days');
select is((select target_xp from public.plans),9000,'Fixed growth target stored by server');
select is((select count(*)::integer from public.plan_weekdays),3,'Three weekday links saved');
select is(pg_temp.start_plan('12000000-0000-4000-c000-000000000001',array[1],array['11000000-0000-4000-c000-000000000001']::uuid[]),
  '12000000-0000-4000-c000-000000000001'::uuid,'Same request retry returns original plan without rewriting it');
select is(pg_temp.start_plan(gen_random_uuid(),array[1],array['11000000-0000-4000-c000-000000000001']::uuid[]),null::uuid,'New request cannot replace active plan');
select is((select count(*)::integer from public.plans),1,'Only one active plan per account');
select is((select count(*)::integer from public.plan_weekdays),3,'Retry preserves original weekday assignments');

select throws_ok($$delete from public.routines where id='11000000-0000-4000-c000-000000000001'$$,'PT409','Routine is used by an active plan','Active plan routine deletion rejected');
select throws_ok($$delete from public.exercises where id='10000000-0000-4000-c000-000000000001'$$,'23503',null,'Linked exercise deletion remains rejected');
select lives_ok($$select public.save_routine_bundle('11000000-0000-4000-c000-000000000001',auth.uid(),'Renamed routine','memo',array['10000000-0000-4000-c000-000000000001']::uuid[],(select version from public.routines where id='11000000-0000-4000-c000-000000000001'))$$,'Linked routine remains editable');
select is((select r.name from public.plan_weekdays w join public.routines r on r.id=w.routine_id limit 1),'Renamed routine','Plan uses current linked routine');
select throws_ok($$update public.plans set target_xp=1$$,'42501',null,'Client cannot change growth baseline');
select throws_ok($$update public.plans set status='completed'$$,'42501',null,'Client cannot bypass active-plan guard');
select throws_ok($$delete from public.plans$$,'42501',null,'Plan deletion not exposed');
select throws_ok($$insert into public.plans(id,user_id,start_date,time_zone,duration,exercise_day_count) values(gen_random_uuid(),'00000000-0000-4000-c000-000000000002',current_date,'UTC',14,6)$$,'42501',null,'Owner spoof blocked');
select throws_ok($$insert into public.plan_weekdays(plan_id,weekday,routine_id) values('12000000-0000-4000-c000-000000000001',2,'11000000-0000-4000-c000-000000000002')$$,'23503',null,'Direct foreign-routine link rejected');
select throws_ok($$insert into public.plan_weekdays(plan_id,weekday,routine_id) values('12000000-0000-4000-c000-000000000002',2,'11000000-0000-4000-c000-000000000001')$$,'23503',null,'Direct foreign-plan link rejected');
select throws_ok($$
do $body$ begin
  insert into public.plan_weekdays(plan_id,weekday,routine_id)
  values('12000000-0000-4000-c000-000000000001',2,'11000000-0000-4000-c000-000000000001');
  set constraints require_plan_weekday_schedule immediate;
end $body$;
$$,'23514','Invalid plan exercise day count','Direct schedule extension cannot alter stored baseline');

-- Use the privileged test role only to check integrity and future ended-plan deletion semantics.
reset role;
update public.plans set status='stopped' where id='12000000-0000-4000-c000-000000000001';
set local role authenticated;
select lives_ok($$delete from public.routines where id='11000000-0000-4000-c000-000000000001'$$,'Ended plan does not block routine deletion');
select is((select count(*)::integer from public.plan_weekdays where routine_id is null),3,'Ended schedule survives routine deletion');
select throws_ok($$
do $body$ begin
  insert into public.plans(id,start_date,time_zone,duration,exercise_day_count)
  values(gen_random_uuid(),current_date,'UTC',14,6);
  set constraints require_plan_schedule immediate;
end $body$;
$$,'23514','Invalid plan exercise day count','Bare plan insert cannot bypass schedule validation');
select * from finish();
rollback;
