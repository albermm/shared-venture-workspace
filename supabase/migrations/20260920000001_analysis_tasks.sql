-- Shared work queue for agents collaborating on idea analysis.
create table if not exists public.analysis_tasks (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  idea_id            uuid not null references public.ideas(id) on delete cascade,
  requested_by       text not null,
  assigned_to        text,
  prompt             text not null,
  status             text not null default 'pending'
                     check (status in ('pending', 'claimed', 'completed', 'cancelled')),
  result_analysis_id uuid references public.analyses(id) on delete set null,
  claimed_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists analysis_tasks_project_status_idx
  on public.analysis_tasks (project_id, status, created_at);

create trigger analysis_tasks_updated_at
  before update on public.analysis_tasks
  for each row execute function set_updated_at();
