begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
-- Local-only fixtures, rolled back including any existing local submissions.
delete from public.submissions;
insert into auth.users(id)
select ('10000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
from generate_series(1,10001) n;
create temporary table capacity_fixture as
select jsonb_object_agg(key,'B'::text) as rankings
from unnest(array['bakerloo','central','circle','district','elizabeth','hammersmith-city','jubilee','metropolitan','northern','piccadilly','victoria','waterloo-city','overground','dlr','trams','thameslink','cable-car','uber-boat','heathrow-express']) as key;
grant select on capacity_fixture to authenticated;
insert into public.submissions(user_id,username,rankings,updated_at)
select ('10000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
       'Test voter ' || n,(select rankings from capacity_fixture),now()-interval '1 minute'
from generate_series(1,9999) n;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000010000","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.submit_ranking('Incomplete','{}'::jsonb)$$,'23514',null,'Invalid vote does not consume the final slot');
select is((select count(*) from public.submissions),9999::bigint,'9999 submissions before final slot');
select lives_ok($$select public.submit_ranking('Last voter',(select rankings from capacity_fixture))$$,'Submission 10000 is accepted');
select is((select count(*) from public.submissions),10000::bigint,'Exactly 10000 submissions stored');
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000010001","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.submit_ranking('Too late',(select rankings from capacity_fixture))$$,'PT429',null,'Submission 10001 is rejected');
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$select public.submit_ranking('Updated voter',(select rankings from capacity_fixture))$$,'Existing voters can update when full');
select is((select count(*) from public.submissions),10000::bigint,'Updating does not consume capacity');
select throws_ok($$select public.submit_ranking('Updated voter',(select rankings from capacity_fixture))$$,'P0001',null,'Update cooldown remains enforced');
reset role;
select * from finish();
rollback;
