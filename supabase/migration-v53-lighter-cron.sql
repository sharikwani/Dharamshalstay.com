-- v53: lighten the load on the free-plan database (Disk IO budget ran out on 26 Oct 2026).
-- 1. The website heartbeat (emails, social, stories) runs every 15 minutes instead of 10.
--    alter_job keeps the existing command and its secret; nothing secret is in this file.
-- 2. Clear old pg_cron run history and pg_net responses, and keep them trimmed daily.
-- Run once in the Supabase SQL editor.

SELECT cron.alter_job(jobid, schedule := '*/15 * * * *')
FROM cron.job WHERE jobname = 'email-engine';

DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days';
DELETE FROM net._http_response WHERE created < now() - interval '1 day';

SELECT cron.unschedule('trim-cron-history') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trim-cron-history');
SELECT cron.schedule(
  'trim-cron-history',
  '17 3 * * *',
  $$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days';
     DELETE FROM net._http_response WHERE created < now() - interval '1 day'; $$
);

-- Check: should show email-engine at */15 and trim-cron-history daily.
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
