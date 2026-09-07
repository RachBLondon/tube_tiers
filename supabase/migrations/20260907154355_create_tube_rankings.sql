-- The reference contains 18 services, with Overground represented as one entry.
create function public.valid_tube_rankings(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'object' then false else
    (select count(*) = 18 and bool_and(
      key = any(array['bakerloo','central','circle','district','elizabeth','hammersmith-city',
        'jubilee','northern','piccadilly','victoria','waterloo-city','overground','dlr',
        'trams','thameslink','cable-car','uber-boat','heathrow-express'])
      and jsonb_typeof(val) = 'string'
      and val #>> '{}' = any(array['A*','A','B','C','D','E','F'])
    ) from jsonb_each(value) as entry(key,val))
  end;
$$;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null check (username = btrim(username) and char_length(username) between 2 and 40
    and username ~ '^[[:alnum:]][[:alnum:] ._''’–-]+$'),
  rankings jsonb not null check (public.valid_tube_rankings(rankings)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_created_at_idx on public.submissions(created_at desc, id desc);
alter table public.submissions enable row level security;
create policy "Rankings are public" on public.submissions for select to anon, authenticated using (true);
create policy "Only insert your own submission" on public.submissions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Only update your own submission" on public.submissions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No client can delete votes or read the private session identity column.
revoke all on public.submissions from anon, authenticated;
grant select(id, username, rankings, created_at, updated_at) on public.submissions to anon, authenticated;
grant insert(user_id, username, rankings) on public.submissions to authenticated;
grant update(username, rankings) on public.submissions to authenticated;

create function public.guard_submission_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.updated_at > clock_timestamp() - interval '30 seconds' then
    raise exception 'Please wait 30 seconds before updating your ranking.' using errcode = 'P0001';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger submission_update_cooldown before update on public.submissions for each row execute function public.guard_submission_update();

-- One atomic write per anonymous identity. Identity is obtained from the signed
-- JWT, never from user input. Definer needed to upsert on the private user_id.
create function public.submit_ranking(p_username text, p_rankings jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result_id uuid; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'An anonymous session is required.' using errcode = '42501'; end if;
  insert into public.submissions(user_id, username, rankings)
  values(actor, btrim(p_username), p_rankings)
  on conflict(user_id) do update set username = excluded.username, rankings = excluded.rankings
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.submit_ranking(text,jsonb) from public, anon;
grant execute on function public.submit_ranking(text,jsonb) to authenticated;
-- All writes use the constrained function; no direct PostgREST mutations.
revoke insert, update on public.submissions from authenticated;
revoke insert(user_id, username, rankings), update(username, rankings) on public.submissions from authenticated;

-- Aggregate inside Postgres so the API's row limit cannot truncate averages.
create function public.community_averages()
returns table(line_id text, average_score numeric, votes bigint)
language sql stable security invoker set search_path = '' as $$
  select r.key, avg(case r.value when 'A*' then 6 when 'A' then 5 when 'B' then 4
    when 'C' then 3 when 'D' then 2 when 'E' then 1 when 'F' then 0 end), count(*)
  from public.submissions s cross join lateral jsonb_each_text(s.rankings) r
  group by r.key order by 2 desc, r.key;
$$;
revoke all on function public.community_averages() from public;
grant execute on function public.community_averages() to anon, authenticated;
