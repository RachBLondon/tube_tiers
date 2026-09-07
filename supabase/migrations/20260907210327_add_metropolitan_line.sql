begin;
-- Serialize with voting and prevent partially migrated rankings being observed.
select pg_catalog.pg_advisory_xact_lock(731024,1000);
lock table public.submissions in access exclusive mode;
create or replace function public.valid_tube_rankings(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'object' then false else
    (select count(*) = 19 and bool_and(
      key = any(array['bakerloo','central','circle','district','elizabeth','hammersmith-city',
        'jubilee','metropolitan','northern','piccadilly','victoria','waterloo-city','overground','dlr',
        'trams','thameslink','cable-car','uber-boat','heathrow-express'])
      and jsonb_typeof(val) = 'string'
      and val #>> '{}' = any(array['A*','A','B','C','D','E','F'])
    ) from jsonb_each(value) as entry(key,val))
  end;
$$;


-- Administrative backfill: preserve submission times and bypass only the
-- user-update cooldown, while the table is exclusively locked in this transaction.
alter table public.submissions disable trigger submission_update_cooldown;
update public.submissions
set rankings = rankings || '{"metropolitan":"C"}'::jsonb
where not (rankings ? 'metropolitan');
alter table public.submissions enable trigger submission_update_cooldown;
commit;
