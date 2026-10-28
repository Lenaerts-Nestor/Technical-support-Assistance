-- Starts the shift reminders (Monday to Friday, Shift 1 at 11:45 and Shift 2 at 12:30, Brussels time).
--
-- Run this ONCE, after supabase/lunch_shift.sql, and after switching on the Cron extension:
-- Supabase dashboard -> Integrations -> Cron -> Enable (the create extension line below does the same).
-- It is safe to run again: it replaces the timer instead of adding a second one.
--
-- The timer: every 5 minutes, Monday to Friday, UTC hours 8-12 (covers 11:45 and 12:30 Brussels time in summer and winter).
-- pg_cron must be switched on: Supabase dashboard -> Integrations -> Cron (or the line below).
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'lunch-shift-reminders';
select cron.schedule('lunch-shift-reminders', '*/5 8-12 * * 1-5', 'select public.send_shift_reminders()');


-- Stop the reminders:  select cron.unschedule('lunch-shift-reminders');
