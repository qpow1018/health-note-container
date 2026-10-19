begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(id) values
('00000000-0000-4000-a000-000000000001'),
('00000000-0000-4000-a000-000000000002');
insert into public.exercises(id,user_id,name,position) values
('10000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001','A first',1),
('10000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000001','A second',2),
('20000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002','B exercise',1);

set local role anon;
select throws_ok('select * from public.exercises', '42501', null, 'Anonymous read denied');
select throws_ok($$insert into public.exercises(name) values ('anonymous')$$, '42501', null, 'Anonymous insert denied');
select throws_ok($$update public.exercises set name = 'anonymous'$$, '42501', null, 'Anonymous update denied');
select throws_ok('delete from public.exercises', '42501', null, 'Anonymous delete denied');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::integer from public.exercises),2,'A sees only own exercises');
select lives_ok($$insert into public.exercises(name,amount,sets) values ('A new','10회',3)$$,'A can create own exercise');
select throws_ok($$insert into public.exercises(name,user_id) values ('spoof','00000000-0000-4000-a000-000000000002')$$,'42501',null,'Cannot insert as another owner');
with changed as (update public.exercises set name = 'wrong' where id = '20000000-0000-4000-a000-000000000001' returning id) select is((select count(*)::integer from changed),0,'Cannot update B exercise');
with changed as (delete from public.exercises where id = '20000000-0000-4000-a000-000000000001' returning id) select is((select count(*)::integer from changed),0,'Cannot delete B exercise');
select throws_ok($$update public.exercises set user_id='00000000-0000-4000-a000-000000000002'$$,'42501',null,'Ownership reassignment denied');
select throws_ok($$insert into public.exercises(name,sets) values ('bad sets',0)$$,'23514',null,'Invalid sets rejected');
select throws_ok($$insert into public.exercises(name) values ('   ')$$,'23514',null,'Blank name rejected');
update public.exercises set memo='edited' where id='10000000-0000-4000-a000-000000000001' and version=1;
select is((select version from public.exercises where id='10000000-0000-4000-a000-000000000001'),2,'Content edit increments version');
with changed as (update public.exercises set memo='stale' where id='10000000-0000-4000-a000-000000000001' and version=1 returning id) select is((select count(*)::integer from changed),0,'Stale edit does not overwrite');
delete from public.exercises where name='A new';
select is(public.reorder_exercises(
 array['10000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000001']::uuid[],
 array['10000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000002']::uuid[]),true,'Valid reorder succeeds');
select is((select array_agg(name order by position) from public.exercises),array['A second','A first'],'New order persisted');
select is(public.reorder_exercises(
 array['10000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000002']::uuid[],
 array['10000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000002']::uuid[]),false,'Outdated order rejected');
select throws_ok($$select public.reorder_exercises(
 array['10000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000002']::uuid[],
 array['10000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000001']::uuid[])$$, 'P0001','Invalid exercise order','Duplicate IDs rejected atomically');
select is((select version from public.exercises where id='10000000-0000-4000-a000-000000000001'),2,'Reorder preserves content version');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select array_agg(name) from public.exercises),array['B exercise'],'B sees only own unchanged exercise');
select * from finish();
rollback;
