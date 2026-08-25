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
  body := jsonb_build_object('test', true),
  timeout_milliseconds := 15000
) as request_id;
