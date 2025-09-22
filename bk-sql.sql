-- Enable pgcrypto if not present:
create extension if not exists "pgcrypto";

create table if not exists bug_reports (
id uuid default gen_random_uuid() primary key,
title text not null,
description text,
steps text,
expected text,
actual text,
reproducibility text,
occurred_at timestamptz,
server_info text,
resources text,
logs text,
attachments jsonb, -- array of { path, url, filename }
priority text,
reporter text,
created_at timestamptz default now()
);


alter table bug_reports
  add column if not exists status text default 'open';

alter table bug_reports
  add column if not exists resolved_at timestamptz;

-- (Valfritt) index för filtrering
create index if not exists bug_reports_status_idx on bug_reports (status);
create index if not exists bug_reports_created_at_idx on bug_reports (created_at desc);



-- Valfritt constraint
alter table bug_reports
  add constraint bug_reports_status_check
  check (status in ('open','in_progress','resolved'))
  not valid;
-- (senare) validate constraint:
alter table bug_reports validate constraint bug_reports_status_check;