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
--   * TEAMS  the first publish of a day also posts the schedule to a Teams chat/channel through a
--            Workflows webhook. The webhook address is kept in private.settings, a table the public
--            key cannot see (see the end of this file for how to store it). Later publishes the same
--            day do not post again. Without the setting nothing is posted.
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

-- One Teams post per day: set by the first publish that posts, so a second press cannot post again.
alter table public.lunch_shift add column if not exists teams_posted_at timestamptz;

-- Sends the Teams post (a queued web request that runs after the publish is saved).
create extension if not exists pg_net;

-- Secrets live in a schema the public API never exposes, behind row level security as well.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.settings (
  name  text primary key,
  value text not null
);
alter table private.settings enable row level security;
revoke all on private.settings from public, anon, authenticated;

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

-- The old 5-argument version is replaced by one that also takes who is on chat / out and the warnings.
drop function if exists public.publish_lunch_shift(date, text[], text[], text[], text);

create or replace function public.publish_lunch_shift(
  p_day       date,
  p_shift1    text[],
  p_shift2    text[],
  p_team      text[],
  p_publisher text,
  p_chat      text[] default '{}',
  p_out       text[] default '{}',
  p_notes     text[] default '{}'
)
returns text   -- 'posted' (Teams post queued), 'already' (Teams already posted for this day), 'off' (no webhook set)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publisher text   := btrim(coalesce(p_publisher, ''));
  v_shift1    text[] := coalesce(p_shift1, '{}');
  v_shift2    text[] := coalesce(p_shift2, '{}');
  v_team      text[] := coalesce(p_team, '{}');
  v_chat      text[] := coalesce(p_chat, '{}');
  v_out       text[] := coalesce(p_out, '{}');
  v_notes     text[] := coalesce(p_notes, '{}');
  v_url       text;
  v_first     boolean := false;
  v_body      jsonb;
begin
  -- The publisher list. Edit here AND in src/features/shift/config.ts.
  if lower(v_publisher) not in ('kevin c', 'nestor') then
    raise exception 'This name may not publish the lunch shift.' using errcode = '42501';
  end if;

  if p_day is null or abs(p_day - current_date) > 1 then
    raise exception 'The lunch shift can only be published for today.' using errcode = '22023';
  end if;

  if cardinality(v_shift1) > 60 or cardinality(v_shift2) > 60 or cardinality(v_team) > 120
     or cardinality(v_chat) > 60 or cardinality(v_out) > 60 or cardinality(v_notes) > 10 then
    raise exception 'Too many names.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_shift1 || v_shift2 || v_team || v_chat || v_out) as n
    where n is null or char_length(btrim(n)) not between 1 and 40
  ) or exists (
    select 1 from unnest(v_notes) as n where n is null or char_length(btrim(n)) not between 1 and 160
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
        updated_at   = excluded.updated_at;   -- teams_posted_at is deliberately left alone

  delete from public.lunch_shift where day < current_date - 14;

  select s.value into v_url from private.settings s where s.name = 'teams_webhook_url';
  if v_url is null or v_url = '' then
    return 'off';
  end if;

  -- ONCE PER DAY (testing): this single UPDATE claims the day's Teams post, so two presses at the same
  -- moment still post only once. To allow a post for every publish later, drop "and teams_posted_at is null".
  update public.lunch_shift
     set teams_posted_at = now()
   where day = p_day and teams_posted_at is null
  returning true into v_first;

  if not coalesce(v_first, false) then
    return 'already';
  end if;

  v_body := jsonb_build_array(
    jsonb_build_object('type', 'TextBlock', 'text', 'TODAY''S SCHEDULE', 'weight', 'Bolder', 'wrap', true),
    jsonb_build_object('type', 'TextBlock', 'text', 'LUNCH SHIFT:', 'weight', 'Bolder', 'wrap', true, 'spacing', 'Medium'),
    jsonb_build_object('type', 'TextBlock', 'text', '1st: ' || coalesce(nullif(array_to_string(v_shift1, ', '), ''), '-'), 'wrap', true, 'spacing', 'Small'),
    jsonb_build_object('type', 'TextBlock', 'text', '2nd: ' || coalesce(nullif(array_to_string(v_shift2, ', '), ''), '-'), 'wrap', true, 'spacing', 'Small'),
    jsonb_build_object('type', 'TextBlock', 'text', 'CHAT', 'weight', 'Bolder', 'wrap', true, 'spacing', 'Medium'),
    jsonb_build_object('type', 'TextBlock', 'text', coalesce(nullif(array_to_string(v_chat, ', '), ''), '-'), 'wrap', true, 'spacing', 'Small'),
    jsonb_build_object('type', 'TextBlock', 'text', 'PTO/OOO', 'weight', 'Bolder', 'wrap', true, 'spacing', 'Medium'),
    jsonb_build_object('type', 'TextBlock', 'text', coalesce(nullif(array_to_string(v_out, ', '), ''), '-'), 'wrap', true, 'spacing', 'Small')
  );
  if cardinality(v_notes) > 0 then
    v_body := v_body
      || jsonb_build_array(jsonb_build_object('type', 'TextBlock', 'text', 'NOTES', 'weight', 'Bolder', 'wrap', true, 'spacing', 'Medium'))
      || (select jsonb_agg(jsonb_build_object('type', 'TextBlock', 'text', n, 'wrap', true, 'spacing', 'Small')) from unnest(v_notes) as n);
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
                 'type', 'message',
                 'attachments', jsonb_build_array(jsonb_build_object(
                   'contentType', 'application/vnd.microsoft.card.adaptive',
                   'contentUrl', null,
                   'content', jsonb_build_object(
                     '$schema', 'http://adaptivecards.io/schemas/adaptive-card.json',
                     'type', 'AdaptiveCard',
                     'version', '1.4',
                     'msteams', jsonb_build_object('width', 'Full'),
                     'body', v_body))) ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return 'posted';
end;
$$;

-- Functions are executable by everyone by default; allow only the app's public role.
revoke all on function public.publish_lunch_shift(date, text[], text[], text[], text, text[], text[], text[]) from public, anon, authenticated;
grant execute on function public.publish_lunch_shift(date, text[], text[], text[], text, text[], text[], text[]) to anon;

-- ---------------------------------------------------------------------------------------------------
-- TEAMS WEBHOOK ADDRESS. Run this on its own, ONCE, in the SQL editor, with the real address from the
-- Teams workflow ("Send webhook alerts to a channel / chat"). Do NOT save the address in this file or in
-- the repository: whoever has it can post to that chat.
--
--   insert into private.settings (name, value) values ('teams_webhook_url', 'PASTE-THE-ADDRESS-HERE')
--   on conflict (name) do update set value = excluded.value;
--
-- Turn Teams posting off again:   delete from private.settings where name = 'teams_webhook_url';
-- Allow a post again today (for a retest):   update public.lunch_shift set teams_posted_at = null where day = current_date;
-- Did Teams accept the last posts?   select id, status_code, error_msg, created from net._http_response order by created desc limit 5;
--   (202 = accepted by the workflow. Anything else: see the number and error_msg.)
-- ---------------------------------------------------------------------------------------------------

-- Quick checks, run them one by one after the script (each should behave as the comment says).
-- NOTE: once the Teams address is stored, a successful publish below POSTS TO THE REAL CHAT (once per day).
--   select * from public.lunch_shift;                                   -- works, empty at first
--   select public.publish_lunch_shift(current_date, '{Ann}', '{Bo}', '{Ann,Bo}', 'Nestor');   -- works: 'off' (no webhook) or 'posted'
--   select public.publish_lunch_shift(current_date, '{Ann}', '{Bo}', '{Ann,Bo}', 'Someone');  -- error: may not publish
--   select public.publish_lunch_shift(current_date - 5, '{}', '{}', '{}', 'Nestor');          -- error: only for today
