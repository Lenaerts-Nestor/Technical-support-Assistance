-- Shared lunch roster for Support Hub: the agents of the Lunch Planner, the same list for everyone who plans lunch.
--
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it never drops the table or its rows).
--
-- What it stores: one row per agent: name, languages, "chat agent" and "early shift". Nothing else. Who is in today and
-- yesterday's shift are NOT stored here: they are day-to-day state that every computer works out from the published
-- schedules (see supabase/lunch_shift.sql), exactly as before.
--
-- Who can do what (the app uses the public "anon" role, because there are no accounts):
--   * The table itself is closed: the public key cannot select, insert, update or delete in it.
--   * sync_lunch_roster() is the only way in, for reading AND writing. It accepts only a name from the list below
--     (the people who plan lunch), and returns the whole roster after applying what it was sent:
--       p_save     agents to add or change, as [{"id","name","languages":[],"chat","early_shift"}, ...]
--       p_remove   ids of agents to delete
--       p_replace  true: keep only the agents in p_save (an import), the rest are deleted
--     Sending nothing is a plain read. An agent with the same name as an existing one is the same agent (it updates
--     that row), so two computers adding "Ann" at the same time end up with one Ann.
--   Like the published lunch shift, this is an honor system: there are no passwords, so someone who picks "Nestor" can
--   change the roster. Names, languages and two yes/no flags are all that is at stake.
--
-- Keep the list of names below in step with PUBLISHERS in src/features/shift/config.ts (and publish_lunch_shift).
--
-- First use: the first person with the Lunch Planner who opens it after this script ran uploads the roster that is
-- already in their browser; everybody else's roster then follows the shared one.

create table if not exists public.lunch_roster (
  id          text        primary key,            -- made by the app (a UUID); any 1 to 64 characters
  name        text        not null,
  name_key    text        not null,               -- the name trimmed and lower-cased: two agents never share one
  languages   text[]      not null default '{}',
  chat        boolean     not null default false,
  early_shift boolean     not null default false,
  updated_by  text        not null,
  updated_at  timestamptz not null default now(),
  constraint lunch_roster_id    check (char_length(id) between 1 and 64),
  constraint lunch_roster_name  check (char_length(btrim(name)) between 1 and 40),
  constraint lunch_roster_langs check (cardinality(languages) <= 8)
);

create unique index if not exists lunch_roster_name_key on public.lunch_roster (name_key);

-- Locked: row level security on, every default privilege removed, and no policy on purpose
-- (with row level security on, no policy means "denied"). The function below is the only way in.
alter table public.lunch_roster enable row level security;
revoke all on public.lunch_roster from public, anon, authenticated;

create or replace function public.sync_lunch_roster(
  p_by      text,
  p_save    jsonb   default '[]',
  p_remove  text[]  default '{}',
  p_replace boolean default false
)
returns jsonb   -- the whole roster, by name: [{"id","name","languages","chat","early_shift","updated_by","updated_at"}, ...]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_by      text    := btrim(coalesce(p_by, ''));
  v_save    jsonb   := coalesce(p_save, '[]'::jsonb);
  v_remove  text[]  := coalesce(p_remove, '{}');
  v_replace boolean := coalesce(p_replace, false);
  v_item    jsonb;
  v_id      text;
  v_name    text;
  v_key     text;
  v_langs   text[];
  v_chat    boolean;
  v_early   boolean;
  v_ids     text[] := '{}';
  v_keys    text[] := '{}';
begin
  -- The list of people who plan lunch. Edit here AND in src/features/shift/config.ts.
  if lower(v_by) not in ('kevin c', 'nestor') then
    raise exception 'This name may not change the lunch roster.' using errcode = '42501';
  end if;

  if jsonb_typeof(v_save) <> 'array' or jsonb_array_length(v_save) > 120 or cardinality(v_remove) > 240 then
    raise exception 'Too many agents.' using errcode = '22023';
  end if;
  if v_replace and jsonb_array_length(v_save) = 0 then
    raise exception 'The roster cannot be replaced by nothing.' using errcode = '22023';
  end if;

  -- Every agent is checked first, so a bad one changes nothing at all.
  for v_item in select value from jsonb_array_elements(v_save) loop
    v_id   := btrim(coalesce(v_item ->> 'id', ''));
    v_name := btrim(coalesce(v_item ->> 'name', ''));
    if char_length(v_id) not between 1 and 64 or char_length(v_name) not between 1 and 40 then
      raise exception 'Every agent needs an id and a name of 1 to 40 characters.' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(v_item -> 'languages', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v_item -> 'languages', '[]'::jsonb)) > 8
       or exists (
         select 1 from jsonb_array_elements(coalesce(v_item -> 'languages', '[]'::jsonb)) l
          where jsonb_typeof(l) <> 'string' or char_length(btrim(l #>> '{}')) not between 1 and 30
       ) then
      raise exception 'An agent has at most 8 languages of 1 to 30 characters.' using errcode = '22023';
    end if;
    v_ids  := v_ids  || v_id;
    v_keys := v_keys || lower(v_name);
  end loop;

  delete from public.lunch_roster where id = any(v_remove);

  -- An import keeps only what it brought. An agent that has the same name as one it brought is not deleted here:
  -- it is the same agent, and is updated below.
  if v_replace then
    delete from public.lunch_roster r where r.id <> all(v_ids) and r.name_key <> all(v_keys);
  end if;

  for v_item in select value from jsonb_array_elements(v_save) loop
    v_id    := btrim(v_item ->> 'id');
    v_name  := btrim(v_item ->> 'name');
    v_key   := lower(v_name);
    v_chat  := coalesce((v_item ->> 'chat')::boolean, false);
    v_early := coalesce((v_item ->> 'early_shift')::boolean, false);
    select coalesce(array_agg(btrim(l #>> '{}') order by o), '{}')
      into v_langs
      from jsonb_array_elements(coalesce(v_item -> 'languages', '[]'::jsonb)) with ordinality as t(l, o);

    -- One agent that cannot be saved (a rename onto a name another agent has) is skipped, not the whole batch:
    -- the roster returned below shows how it really stands, and the app shows that.
    begin
      update public.lunch_roster
         set name = v_name, name_key = v_key, languages = v_langs, chat = v_chat, early_shift = v_early,
             updated_by = v_by, updated_at = now()
       where id = v_id;
      if not found then
        -- Same name as an agent that has another id: the same person, so that row is updated and keeps its id.
        update public.lunch_roster
           set name = v_name, languages = v_langs, chat = v_chat, early_shift = v_early,
               updated_by = v_by, updated_at = now()
         where name_key = v_key;
        if not found then
          insert into public.lunch_roster (id, name, name_key, languages, chat, early_shift, updated_by)
          values (v_id, v_name, v_key, v_langs, v_chat, v_early, v_by);
        end if;
      end if;
    exception when unique_violation then
      null;
    end;
  end loop;

  if (select count(*) from public.lunch_roster) > 120 then
    raise exception 'The lunch roster is full (120 agents).' using errcode = '53400';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id, 'name', r.name, 'languages', to_jsonb(r.languages), 'chat', r.chat,
             'early_shift', r.early_shift, 'updated_by', r.updated_by, 'updated_at', r.updated_at
           ) order by r.name_key, r.id), '[]'::jsonb)
      from public.lunch_roster r
  );
end;
$$;

-- Functions are executable by everyone by default; allow only the app's public role.
revoke all on function public.sync_lunch_roster(text, jsonb, text[], boolean) from public, anon, authenticated;
grant execute on function public.sync_lunch_roster(text, jsonb, text[], boolean) to anon;

-- Quick checks, run them one by one after the script (each should behave as the comment says).
--   select public.sync_lunch_roster('Nestor');                                                     -- [] at first: a plain read
--   select public.sync_lunch_roster('Someone');                                                    -- error: may not change
--   select public.sync_lunch_roster('Nestor', '[{"id":"t1","name":"Test Ann","languages":["Dutch"],"chat":true,"early_shift":false}]');   -- works
--   select public.sync_lunch_roster('Kevin C', '[{"id":"t2","name":" test ann ","languages":[],"chat":false,"early_shift":true}]');         -- same agent: still one row
--   select public.sync_lunch_roster('Nestor', '[]', '{t1}');                                       -- removes Test Ann
--   select * from public.lunch_roster;                                                             -- works only in this editor
