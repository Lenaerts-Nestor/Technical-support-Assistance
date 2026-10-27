-- Shared lunch shift for Support Hub.
--
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it never drops the table or its rows).
--
-- What it stores: first names and a shift number, one row per day. Nothing else.
--
-- Who can do what (the app uses the public "anon" role, because there are no accounts):
--   * READ   anyone with the project key may read the last 14 days. Names and shifts only.
--   * WRITE  nobody can insert, update or delete in the table directly. The only way in is
--            publish_lunch_shift(), which accepts a publisher from the list below, a day within
--            one day of today, and short name lists, and which also deletes rows older than 14 days.
--
-- Keep the publisher list below in step with PUBLISHERS in src/features/shift/config.ts.

create table if not exists public.lunch_shift (
  day          date primary key,
  shift1       text[] not null default '{}',
  shift2       text[] not null default '{}',
  -- Every name on the publisher's roster, so a new agent's "I am" list is filled without importing a roster.
  team         text[] not null default '{}',
  published_by text   not null,
  updated_at   timestamptz not null default now(),
  constraint lunch_shift_sizes check (
    cardinality(shift1) <= 60 and cardinality(shift2) <= 60 and cardinality(team) <= 120
  )
);

-- Locked first, opened second: row level security on, then every default privilege removed.
alter table public.lunch_shift enable row level security;
revoke all on public.lunch_shift from public, anon, authenticated;

grant select on public.lunch_shift to anon;

drop policy if exists "anyone can read recent shifts" on public.lunch_shift;
create policy "anyone can read recent shifts"
  on public.lunch_shift
  for select
  to anon
  using (day >= current_date - 14);

-- No insert / update / delete policy exists on purpose: with row level security on, that means "denied".

create or replace function public.publish_lunch_shift(
  p_day       date,
  p_shift1    text[],
  p_shift2    text[],
  p_team      text[],
  p_publisher text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publisher text := btrim(coalesce(p_publisher, ''));
  v_shift1    text[] := coalesce(p_shift1, '{}');
  v_shift2    text[] := coalesce(p_shift2, '{}');
  v_team      text[] := coalesce(p_team, '{}');
begin
  -- The publisher list. Edit here AND in src/features/shift/config.ts.
  if lower(v_publisher) not in ('kevin c', 'nestor') then
    raise exception 'This name may not publish the lunch shift.' using errcode = '42501';
  end if;

  if p_day is null or abs(p_day - current_date) > 1 then
    raise exception 'The lunch shift can only be published for today.' using errcode = '22023';
  end if;

  if cardinality(v_shift1) > 60 or cardinality(v_shift2) > 60 or cardinality(v_team) > 120 then
    raise exception 'Too many names.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_shift1 || v_shift2 || v_team) as n
    where n is null or char_length(btrim(n)) not between 1 and 40
  ) then
    raise exception 'Every name must be 1 to 40 characters.' using errcode = '22023';
  end if;

  insert into public.lunch_shift as t (day, shift1, shift2, team, published_by, updated_at)
  values (p_day, v_shift1, v_shift2, v_team, v_publisher, now())
  on conflict (day) do update
    set shift1       = excluded.shift1,
        shift2       = excluded.shift2,
        team         = excluded.team,
        published_by = excluded.published_by,
        updated_at   = excluded.updated_at;

  delete from public.lunch_shift where day < current_date - 14;
end;
$$;

-- Functions are executable by everyone by default; allow only the app's public role.
revoke all on function public.publish_lunch_shift(date, text[], text[], text[], text) from public, anon, authenticated;
grant execute on function public.publish_lunch_shift(date, text[], text[], text[], text) to anon;

-- Quick checks, run them one by one after the script (each should behave as the comment says):
--   select * from public.lunch_shift;                                   -- works, empty at first
--   select public.publish_lunch_shift(current_date, '{Ann}', '{Bo}', '{Ann,Bo}', 'Nestor');   -- works
--   select public.publish_lunch_shift(current_date, '{Ann}', '{Bo}', '{Ann,Bo}', 'Someone');  -- error: may not publish
--   select public.publish_lunch_shift(current_date - 5, '{}', '{}', '{}', 'Nestor');          -- error: only for today
