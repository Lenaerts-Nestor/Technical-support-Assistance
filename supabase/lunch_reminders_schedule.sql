-- Starts the shift reminders (Monday to Friday, Shift 1 at 11:45 and Shift 2 at 12:45, Brussels time).
--
-- Run this ONCE, after supabase/lunch_shift.sql, and after switching on the Cron extension:
-- Supabase dashboard -> Integrations -> Cron -> Enable (the create extension line below does the same).
-- It is safe to run again: it replaces the timer instead of adding another one.
--
-- The timer only wakes up around the two reminder times, and the function still checks the Brussels clock and sends
-- each shift's reminder once a day. Cron runs on UTC, which is 1 hour behind Brussels in winter and 2 hours in summer,
-- so there is a wake-up for each; the ones that are not the right Brussels time do nothing.
--   Shift 1, 11:45 Brussels = 10:45 UTC (winter) / 09:45 UTC (summer)
--   Shift 2, 12:45 Brussels = 11:45 UTC (winter) / 10:45 UTC (summer)
-- So the timer wakes at :45 past 09, 10 and 11 UTC, Monday to Friday.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname in ('lunch-shift-reminders', 'lunch-shift-reminder-1', 'lunch-shift-reminder-2');
select cron.schedule('lunch-shift-reminders', '45 9-11 * * 1-5', 'select public.send_shift_reminders()');

-- Stop the reminders:  select cron.unschedule('lunch-shift-reminders');
