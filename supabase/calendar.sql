-- Personal calendar (PTO and other days away) for Support Hub.
--
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it never drops the table or its rows).
--
-- What it stores: one row per person (the name picked under "I am" in the sidebar) holding that person's marked
-- days: a date, "pto" or "other", and a short note for "other". Nothing else.
--
-- Who can do what (the app uses the public "anon" role, because there are no accounts):
--   * The table itself is closed: the public key cannot select, insert, update or delete in it.
--   * get_calendar(person)   returns that person's days (or null when they never saved one).
--   * save_calendar(person, days) replaces that person's days. It checks the name (1 to 40 characters), the days
--     (real dates, "pto" or "other", notes up to 60 characters, at most 800 days) and caps the table at 200 people.
--   Because there are no accounts, anyone who has the project key and knows a name can read or replace that
--   person's calendar, exactly as anyone can already read the published lunch shift. Keep it to days away.

create table if not exists public.calendar (
  person     text primary key,   -- the name, trimmed and lower-cased
  name       text        not null,   -- the name as the person wrote it
  entries    jsonb       not null default '[]',
  updated_at timestamptz not null default now(),
  constraint calendar_entries_array check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) <= 800)
);

-- Locked: row level security on, every default privilege removed, and no policy on purpose
-- (with row level security on, no policy means "denied"). The two functions below are the only way in.
alter table public.calendar enable row level security;
revoke all on public.calendar from public, anon, authenticated;

create or replace function public.get_calendar(p_person text)
returns jsonb   -- the days as [{"date","kind","note"}, ...], or null when this person has no saved calendar
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person text := lower(btrim(coalesce(p_person, '')));
  v_entries jsonb;
begin
  if char_length(v_person) not between 1 and 40 then
    raise exception 'A name of 1 to 40 characters is needed.' using errcode = '22023';
  end if;
  select c.entries into v_entries from public.calendar c where c.person = v_person;
  return v_entries;
end;
$$;

create or replace function public.save_calendar(p_person text, p_entries jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text := btrim(coalesce(p_person, ''));
  v_person  text := lower(v_name);
  v_entries jsonb;
begin
  if char_length(v_person) not between 1 and 40 then
    raise exception 'A name of 1 to 40 characters is needed.' using errcode = '22023';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 800 then
    raise exception 'The calendar must be a list of at most 800 days.' using errcode = '22023';
  end if;

  -- Every day is checked, and rebuilt with only the three known fields (one per date, oldest first).
  begin
    select coalesce(jsonb_agg(jsonb_build_object('date', d.date, 'kind', d.kind, 'note', d.note) order by d.date), '[]')
      into v_entries
      from (
        select distinct on (e.date) e.date, e.kind, e.note
          from (
            select (x ->> 'date')::date::text                                   as date,
                   x ->> 'kind'                                                 as kind,
                   case when x ->> 'kind' = 'other' then btrim(coalesce(x ->> 'note', '')) else '' end as note,
                   o                                                            as ord
              from jsonb_array_elements(p_entries) with ordinality as t(x, o)
          ) e
         order by e.date, e.ord desc   -- a date listed twice keeps its last entry
      ) d;
  exception when others then
    raise exception 'Every day needs a real date.' using errcode = '22023';
  end;

  if exists (
    select 1 from jsonb_array_elements(v_entries) x
     where coalesce(x ->> 'kind', '') not in ('pto', 'other') or char_length(x ->> 'note') > 60
  ) then
    raise exception 'Each day must be "pto" or "other", with a note of at most 60 characters.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.calendar where person = v_person)
     and (select count(*) from public.calendar) >= 200 then
    raise exception 'The calendar service is full.' using errcode = '53400';
  end if;

  insert into public.calendar as c (person, name, entries, updated_at)
  values (v_person, v_name, v_entries, now())
  on conflict (person) do update
    set name = excluded.name, entries = excluded.entries, updated_at = excluded.updated_at;
end;
$$;

-- Functions are executable by everyone by default; allow only the app's public role.
revoke all on function public.get_calendar(text) from public, anon, authenticated;
revoke all on function public.save_calendar(text, jsonb) from public, anon, authenticated;
grant execute on function public.get_calendar(text) to anon;
grant execute on function public.save_calendar(text, jsonb) to anon;

-- Quick checks, run them one by one after the script (each should behave as the comment says).
--   select public.get_calendar('Nobody');                                                        -- null
--   select public.save_calendar('Test', '[{"date":"2026-11-02","kind":"pto","note":""}]');       -- works
--   select public.get_calendar(' test ');                                                        -- the day above
--   select public.save_calendar('Test', '[{"date":"2026-02-30","kind":"pto","note":""}]');       -- error: real date
--   select public.save_calendar('Test', '[{"date":"2026-11-02","kind":"holiday","note":""}]');   -- error: pto or other
--   select * from public.calendar;                                                               -- works only in this editor
--   delete from public.calendar where person = 'test';                                           -- clean up
