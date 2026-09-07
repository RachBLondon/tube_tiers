-- Raise capacity without changing the existing lock key, ownership rules or cooldown.
-- All client writes already go through this function (raw writes are revoked).
create or replace function public.submit_ranking(p_username text, p_rankings jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid; actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'An anonymous session is required.' using errcode = '42501';
  end if;

  -- Serialize capacity checks and writes until transaction end, so concurrent
  -- requests cannot both claim the final slot. PostgREST uses READ COMMITTED.
  perform pg_catalog.pg_advisory_xact_lock(731024, 1000);
  if not exists (select 1 from public.submissions where user_id = actor)
     and (select count(*) from public.submissions) >= 10000 then
    raise exception 'This tier list has reached its limit of 10,000 submissions. Existing voters can still update their ranking.'
      using errcode = 'PT429';
  end if;

  insert into public.submissions(user_id, username, rankings)
  values(actor, btrim(p_username), p_rankings)
  on conflict(user_id) do update set username = excluded.username, rankings = excluded.rankings
  returning id into result_id;
  return result_id;
end;
$$;
-- CREATE OR REPLACE retains privileges; restate the intended boundary explicitly.
revoke all on function public.submit_ranking(text,jsonb) from public, anon;
grant execute on function public.submit_ranking(text,jsonb) to authenticated;
