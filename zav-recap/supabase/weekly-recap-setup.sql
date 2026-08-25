create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.weekly_recap_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null,
  period_end timestamptz not null,
  recipient text not null,
  status text not null check (status in ('processing', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_start)
);

alter table public.weekly_recap_deliveries enable row level security;
revoke all on table public.weekly_recap_deliveries from anon, authenticated;

create index if not exists weekly_recap_deliveries_status_idx
  on public.weekly_recap_deliveries (status, period_start desc);

select cron.unschedule(jobid)
from cron.job
where jobname = 'zav-recap-friday-email';

select cron.schedule(
  'zav-recap-friday-email',
  '55 16 * * 5',
  $cron$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'zav_recap_project_url'
    ) || '/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'zav_recap_cron_secret'
      )
    ),
    body := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 15000
  ) as request_id;
  $cron$
);

select jobid, jobname, schedule, active
from cron.job
where jobname = 'zav-recap-friday-email';
