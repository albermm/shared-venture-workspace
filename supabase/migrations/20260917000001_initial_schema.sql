-- Initial schema for Shared Venture Workspace (simplified v1)
-- UUID primary keys + human-readable IDs per project

create extension if not exists "pgcrypto";

-- ============================================================
-- projects
-- ============================================================
create table projects (
  id            uuid primary key default gen_random_uuid(),
  human_id      text not null unique,
  name          text not null,
  description   text,
  status        text not null default 'active'
                check (status in ('active', 'paused', 'archived')),
  owner         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index projects_status_idx on projects (status);

-- ============================================================
-- ideas
-- ============================================================
create table ideas (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  human_id        text not null,
  title           text not null,
  description     text,
  rationale       text,
  status          text not null default 'draft'
                  check (status in ('draft', 'active', 'parked', 'rejected')),
  parent_idea_id  uuid references ideas(id),
  created_by      text not null,
  created_at      timestamptz not null default now(),
  tags            text[] default '{}',

  unique (project_id, human_id)
);

create index ideas_project_id_idx on ideas (project_id);
create index ideas_status_idx on ideas (status);

-- ============================================================
-- hypotheses
-- ============================================================
create table hypotheses (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  human_id      text not null,
  statement     text not null,
  type          text not null
                check (type in (
                  'problem', 'customer', 'value_prop', 'willingness_to_pay',
                  'technical', 'distribution', 'unit_economics', 'other'
                )),
  status        text not null default 'open'
                check (status in ('open', 'supported', 'contradicted', 'retired')),
  confidence    text not null default 'unknown'
                check (confidence in ('unknown', 'weak', 'medium', 'strong')),
  rationale     text,
  created_by    text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (project_id, human_id)
);

create index hypotheses_project_id_idx on hypotheses (project_id);
create index hypotheses_status_idx on hypotheses (status);
create index hypotheses_type_idx on hypotheses (type);

-- ============================================================
-- evidence
-- ============================================================
create table evidence (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  human_id        text not null,
  evidence_type   text not null
                  check (evidence_type in (
                    'interview', 'email', 'experiment_result', 'market_data',
                    'competitor', 'technical_test', 'external_source', 'other'
                  )),
  title           text not null,
  content         text not null,
  source          text,
  source_url      text,
  collected_at    timestamptz,
  created_by      text not null,
  created_at      timestamptz not null default now(),
  metadata        jsonb default '{}',

  unique (project_id, human_id)
);

create index evidence_project_id_idx on evidence (project_id);
create index evidence_type_idx on evidence (evidence_type);

-- ============================================================
-- evidence ↔ hypothesis links
-- ============================================================
create table evidence_hypothesis_links (
  evidence_id     uuid not null references evidence(id) on delete cascade,
  hypothesis_id   uuid not null references hypotheses(id) on delete cascade,
  relationship    text not null
                  check (relationship in ('supports', 'contradicts', 'neutral')),
  created_by      text not null,
  created_at      timestamptz not null default now(),

  primary key (evidence_id, hypothesis_id)
);

create index ehl_hypothesis_id_idx on evidence_hypothesis_links (hypothesis_id);

-- ============================================================
-- analyses
-- ============================================================
create table analyses (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  human_id      text not null,
  author        text not null,
  summary       text not null,
  full_text     text not null,
  confidence    text not null default 'unknown'
                check (confidence in ('unknown', 'weak', 'medium', 'strong')),
  assumptions   text[] default '{}',
  created_at    timestamptz not null default now(),
  metadata      jsonb default '{}',

  unique (project_id, human_id)
);

create index analyses_project_id_idx on analyses (project_id);

-- ============================================================
-- analysis references (to evidence / hypotheses / other analyses)
-- ============================================================
create table analysis_references (
  analysis_id   uuid not null references analyses(id) on delete cascade,
  ref_type      text not null
                check (ref_type in ('evidence', 'hypothesis', 'analysis')),
  ref_id        uuid not null,

  primary key (analysis_id, ref_type, ref_id)
);

create index analysis_refs_ref_idx on analysis_references (ref_type, ref_id);

-- ============================================================
-- experiments
-- ============================================================
create table experiments (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  human_id          text not null,
  objective         text not null,
  methodology       text,
  status            text not null default 'proposed'
                    check (status in ('proposed', 'approved', 'running', 'completed', 'cancelled')),
  owner             text,
  success_criteria  text,
  results_summary   text,
  start_date        date,
  end_date          date,
  created_by        text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (project_id, human_id)
);

create index experiments_project_id_idx on experiments (project_id);
create index experiments_status_idx on experiments (status);

-- ============================================================
-- experiment ↔ hypothesis
-- ============================================================
create table experiment_hypotheses (
  experiment_id   uuid not null references experiments(id) on delete cascade,
  hypothesis_id   uuid not null references hypotheses(id) on delete cascade,

  primary key (experiment_id, hypothesis_id)
);

-- ============================================================
-- agent_outputs (immutable envelope + payload)
-- ============================================================
create table agent_outputs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  run_id          text not null,
  agent_id        text not null,
  agent_name      text not null,
  agent_provider  text not null
                  check (agent_provider in ('xai', 'openai', 'anthropic', 'human', 'other')),
  agent_role      text not null,
  output_type     text not null,
  payload_schema  text,
  payload         jsonb not null default '{}',
  input_ids       uuid[] default '{}',
  created_at      timestamptz not null default now()
);

create index agent_outputs_project_id_idx on agent_outputs (project_id);
create index agent_outputs_run_id_idx on agent_outputs (run_id);
create index agent_outputs_agent_role_idx on agent_outputs (agent_role);
create index agent_outputs_created_at_idx on agent_outputs (created_at desc);

-- ============================================================
-- decisions (human only)
-- ============================================================
create table decisions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  human_id      text not null,
  statement     text not null,
  rationale     text,
  status        text not null default 'accepted'
                check (status in ('proposed', 'accepted', 'rejected', 'superseded')),
  decided_by    text not null,
  decided_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  unique (project_id, human_id)
);

create index decisions_project_id_idx on decisions (project_id);

-- ============================================================
-- decision references
-- ============================================================
create table decision_references (
  decision_id   uuid not null references decisions(id) on delete cascade,
  ref_type      text not null
                check (ref_type in ('hypothesis', 'evidence', 'analysis', 'experiment')),
  ref_id        uuid not null,

  primary key (decision_id, ref_type, ref_id)
);

-- ============================================================
-- Helper: next human-readable ID per project + type
-- ============================================================
create table id_counters (
  project_id    uuid not null references projects(id) on delete cascade,
  entity_type   text not null,          -- 'idea', 'hypothesis', 'evidence', ...
  next_value    integer not null default 1,

  primary key (project_id, entity_type)
);

create or replace function next_human_id(p_project_id uuid, p_entity_type text, p_prefix text)
returns text
language plpgsql
as $$
declare
  v_next integer;
begin
  insert into id_counters (project_id, entity_type, next_value)
  values (p_project_id, p_entity_type, 1)
  on conflict (project_id, entity_type)
  do update set next_value = id_counters.next_value + 1
  returning next_value into v_next;

  -- if it was an insert, next_value is 1; if update, it is the new value
  -- but the RETURNING on DO UPDATE gives the post-update value.
  -- For a pure insert we need to handle the initial case carefully.
  -- Simpler approach: always increment after read.

  return p_prefix || '-' || lpad(v_next::text, 3, '0');
end;
$$;

-- Cleaner version of the counter function
create or replace function allocate_human_id(p_project_id uuid, p_entity_type text, p_prefix text)
returns text
language plpgsql
as $$
declare
  v_next integer;
begin
  loop
    select next_value into v_next
    from id_counters
    where project_id = p_project_id and entity_type = p_entity_type
    for update;

    if not found then
      begin
        insert into id_counters (project_id, entity_type, next_value)
        values (p_project_id, p_entity_type, 2)
        returning 1 into v_next;
        exit;
      exception when unique_violation then
        -- concurrent insert, retry
        continue;
      end;
    else
      update id_counters
      set next_value = v_next + 1
      where project_id = p_project_id and entity_type = p_entity_type;
      exit;
    end if;
  end loop;

  return p_prefix || '-' || lpad(v_next::text, 3, '0');
end;
$$;

-- ============================================================
-- updated_at trigger helper
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger hypotheses_updated_at
  before update on hypotheses
  for each row execute function set_updated_at();

create trigger experiments_updated_at
  before update on experiments
  for each row execute function set_updated_at();
