-- Record the actor responsible for the most recent experiment status change.
alter table public.experiments
  add column if not exists altered_by text;
