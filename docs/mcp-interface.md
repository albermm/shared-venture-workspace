# MCP Interface (Simplified v1)

## Design Principles

- Small, coherent tool surface (≈ 14 tools).
- Domain operations only — never expose raw SQL.
- Compact responses suitable for LLM context.
- All writes carry provenance.
- Agents can only **propose** decisions; humans **record** them.
- Published agent outputs are write-once.

## Authentication

The MCP server expects a simple API key (or project-scoped key) in the request headers / MCP auth mechanism.  
The service-role Supabase key never leaves the server.

## Tools

### Projects

#### `list_projects`
Returns all projects (id, human_id, name, status, updated_at).

#### `get_project`
Input: `project_id` or `human_id`  
Returns full project + high-level counts (open hypotheses, recent evidence, etc.).

#### `get_project_summary`
Input: `project_id`, optional `since` (ISO date)  
Returns a compact recent-activity summary useful for “what changed?” questions.

---

### Ideas

#### `create_idea`
Input:
```json
{
  "project_id": "uuid",
  "title": "string",
  "description": "string",
  "rationale": "string?",
  "parent_idea_id": "uuid?",
  "tags": ["string"]?,
  "created_by": "string"
}
```
Returns the created idea (including generated human_id).

#### `list_ideas`
Input: `project_id`, optional filters (status, limit)

#### `get_idea`
Input: `idea_id` or `human_id` + `project_id`

---

### Hypotheses

#### `create_hypothesis`
Input:
```json
{
  "project_id": "uuid",
  "statement": "string",
  "type": "problem|customer|value_prop|willingness_to_pay|technical|distribution|unit_economics|other",
  "rationale": "string?",
  "confidence": "unknown|weak|medium|strong",
  "created_by": "string"
}
```

#### `list_hypotheses`
Input: `project_id`, optional status / type / confidence filters

#### `get_hypothesis`
Input: `hypothesis_id` or human_id + project_id  
Returns hypothesis + linked evidence summary.

#### `update_hypothesis_status`
Input: `hypothesis_id`, `status`, `confidence?`, `updated_by`  
Only status and confidence may change.

---

### Evidence

#### `create_evidence`
Input:
```json
{
  "project_id": "uuid",
  "evidence_type": "interview|email|experiment_result|market_data|competitor|technical_test|external_source|other",
  "title": "string",
  "content": "string",
  "source": "string",
  "source_url": "string?",
  "collected_at": "ISO datetime?",
  "created_by": "string",
  "metadata": {}
}
```

#### `link_evidence_to_hypothesis`
Input: `evidence_id`, `hypothesis_id`, `relationship` ("supports"|"contradicts"|"neutral"), `created_by`

#### `list_evidence`
Input: `project_id`, optional type / limit

#### `get_evidence`
Input: `evidence_id`

---

### Analyses

#### `create_analysis`
Input:
```json
{
  "project_id": "uuid",
  "author": "string",
  "summary": "string",
  "full_text": "string",
  "confidence": "unknown|weak|medium|strong",
  "assumptions": ["string"]?,
  "references": [
    { "ref_type": "evidence|hypothesis|analysis", "ref_id": "uuid" }
  ]
}
```

#### `list_analyses` / `get_analysis`

---

### Experiments

#### `create_experiment`
Input:
```json
{
  "project_id": "uuid",
  "objective": "string",
  "methodology": "string",
  "hypothesis_ids": ["uuid"],
  "owner": "string",
  "success_criteria": "string?",
  "created_by": "string"
}
```

#### `update_experiment_status`
Input: `experiment_id`, `status`, `results_summary?`, `updated_by`

#### `list_experiments` / `get_experiment`

---

### Agent Outputs

#### `publish_agent_output`
Input: the standard envelope (see contracts/envelope.schema.json)

```json
{
  "schema_version": "1.0",
  "project_id": "uuid",
  "run_id": "string",
  "agent": {
    "id": "string",
    "name": "string",
    "provider": "xai|openai|anthropic|human|other",
    "role": "string"
  },
  "output_type": "string",
  "input_ids": ["uuid"],
  "payload_schema": "string",
  "payload": {}
}
```

Validates envelope + (if known) payload schema. Inserts as immutable row.

#### `list_agent_outputs` / `get_agent_output`

---

### Decisions

#### `propose_decision`  
(Agent-friendly – just creates an analysis or agent_output of type “decision_proposal”)

#### `record_decision`  
**Human only** (enforced by the tool / auth context)

```json
{
  "project_id": "uuid",
  "statement": "string",
  "rationale": "string",
  "decided_by": "string",
  "references": [
    { "ref_type": "hypothesis|evidence|analysis|experiment", "ref_id": "uuid" }
  ]
}
```

#### `list_decisions` / `get_decision`

---

### Utility

#### `search_workspace`
Input: `project_id`, `query` (simple text search across title/statement/content of ideas, hypotheses, evidence, analyses), `limit`

#### `get_weekly_review_data`
Input: `project_id`, `since` (ISO date)  
Returns a structured payload ready for the weekly synthesizer prompt:

- changes this period
- hypothesis movement
- new evidence (for/against)
- experiments completed / running
- open decisions needed
- recent agent outputs of interest

---

## Response Style

All tools return compact JSON. Lists are limited (default 20–50).  
Large text fields (full analysis, long evidence) can be truncated or returned on demand via get_* tools.

## Error Handling

- Validation errors return clear messages + field paths.
- Missing resources → 404-style error.
- Permission / auth failures → clear rejection.
- Never silently overwrite existing reasoning artifacts.
