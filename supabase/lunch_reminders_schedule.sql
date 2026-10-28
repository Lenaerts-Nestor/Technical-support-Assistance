-- Starts the shift reminders (Monday to Friday, Shift 1 at 11:45 and Shift 2 at 12:30, Brussels time).
--
-- Run this ONCE, after supabase/lunch_shift.sql, and after switching on the Cron extension:
-- Supabase dashboard -> Integrations -> Cron -> Enable (the create extension line below does the same).
-- It is safe to run again: it replaces the timers instead of adding more.
--
-- The timer only wakes up at the two reminder times, and the function still checks the Brussels clock and sends each
-- shift's reminder once a day. Cron runs on UTC, which is 1 hour behind Brussels in winter and 2 hours in summer, so
-- each time has two wake-ups; the one that is not the right Brussels time does nothing.
--   Shift 1, 11:45 Brussels = 10:45 UTC (winter) / 09:45 UTC (summer)
--   Shift 2, 12:30 Brussels = 11:30 UTC (winter) / 10:30 UTC (summer)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname in ('lunch-shift-reminders', 'lunch-shift-reminder-1', 'lunch-shift-reminder-2');
select cron.schedule('lunch-shift-reminder-1', '45 9,10 * * 1-5', 'select public.send_shift_reminders()');
select cron.schedule('lunch-shift-reminder-2', '30 10,11 * * 1-5', 'select public.send_shift_reminders()');

-- Stop the reminders:  select cron.unschedule('lunch-shift-reminder-1'); select cron.unschedule('lunch-shift-reminder-2');
