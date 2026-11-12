-- Removes everything about Teams from the shared lunch shift: the webhook address, the Teams post,
-- the shift reminders and the timer that sends them.
--
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run. Safe to run again.
--
-- Kept on purpose: the lunch_shift table and its rows, and publish_lunch_shift() (it still saves a published
-- schedule exactly as before, it just never contacts Teams). Do NOT run supabase/lunch_shift.sql or
-- supabase/lunch_reminders_schedule.sql again afterwards: they would put the Teams parts back.

-- 1. Stop the reminder timer (skipped when the Cron extension was never switched on).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in ('lunch-shift-reminders', 'lunch-shift-reminder-1', 'lunch-shift-reminder-2');
  end if;
end
$$;

-- 2. Forget the webhook address and the reminder settings.
delete from private.settings
 where name in ('teams_webhook_url', 'shift1_reminder_time', 'shift2_reminder_time', 'reminder_timezone');

-- 3. Remove the reminder function and the function that posts to Teams (the reminder one first: it uses the other).
drop function if exists public.send_shift_reminders(timestamptz);
drop function if exists private.post_card(text, jsonb);

-- 4. Publishing now only saves the schedule. It still answers 'off' so the app needs no change.
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
returns text
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

  insert into public.lunch_shift as t (day, shift1, shift2, team, chat, "out", notes, published_by, updated_at)
  values (p_day, v_shift1, v_shift2, v_team, v_chat, v_out, v_notes, v_publisher, now())
  on conflict (day) do update
    set shift1       = excluded.shift1,
        shift2       = excluded.shift2,
        team         = excluded.team,
        chat         = excluded.chat,
        "out"        = excluded."out",
        notes        = excluded.notes,
        published_by = excluded.published_by,
        updated_at   = excluded.updated_at;

  delete from public.lunch_shift where day < current_date - 14;

  return 'off';
end;
$$;

revoke all on function public.publish_lunch_shift(date, text[], text[], text[], text, text[], text[], text[]) from public, anon, authenticated;
grant execute on function public.publish_lunch_shift(date, text[], text[], text[], text, text[], text[], text[]) to anon;

-- 5. Drop the columns that only tracked Teams posts and reminders.
alter table public.lunch_shift drop column if exists teams_posted_at;
alter table public.lunch_shift drop column if exists shift1_reminded_at;
alter table public.lunch_shift drop column if exists shift2_reminded_at;

-- Check afterwards (each should return no rows / 0):
--   select jobname from cron.job where jobname like 'lunch-shift-reminder%';
--   select name from private.settings where name = 'teams_webhook_url';
--   select proname from pg_proc where proname in ('send_shift_reminders', 'post_card');
--
-- Optional: pg_net (the extension that sent the web requests) is left installed in case anything else uses it.
-- If nothing does:  drop extension if exists pg_net;
