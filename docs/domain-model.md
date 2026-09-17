# Domain Model (Simplified v1)

## Guiding Rules

1. **Evidence ≠ Analysis**  
   Evidence is an observation or external fact. Analysis is reasoning about evidence.

2. **Agent recommendations ≠ Human decisions**  
   Agents may propose. Only humans create final `decisions`.

3. **Published agent outputs are immutable**  
   Once written, they are never updated in place. New versions are new rows.

4. **Everything has provenance**  
   Who/what created it, when, and based on which inputs.

5. **Human-readable IDs**  
   Scoped per project (IDEA-001, HYP-014, EVD-041, etc.).

## Entities

### projects
The top-level container for a venture/product idea being explored.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| human_id            | text          | e.g. "PROJ-gutter-robot"       |
| name                | text          |                                |
| description         | text          |                                |
| status              | text          | active / paused / archived     |
| owner               | text          | simple string for v1           |
| created_at          | timestamptz   |                                |
| updated_at          | timestamptz   |                                |

### ideas
Proposed opportunities or directions.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| human_id            | text          | IDEA-001 (per project)         |
| title               | text          |                                |
| description         | text          |                                |
| rationale           | text          |                                |
| status              | text          | draft / active / parked / rejected |
| parent_idea_id      | uuid FK?      | optional hierarchy             |
| created_by          | text          | "human:alice" or "agent:critic-v1" |
| created_at          | timestamptz   |                                |
| tags                | text[]        | optional                       |

Ideas are never overwritten. Status can change; content is append-only via new ideas or analyses.

### hypotheses
The central object. Explicit, testable statements.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| human_id            | text          | HYP-014                        |
| statement           | text          | the hypothesis itself          |
| type                | text          | problem / customer / value_prop / willingness_to_pay / technical / distribution / unit_economics / other |
| status              | text          | open / supported / contradicted / retired |
| confidence          | text          | unknown / weak / medium / strong |
| rationale           | text          |                                |
| created_by          | text          |                                |
| created_at          | timestamptz   |                                |
| updated_at          | timestamptz   | (status/confidence only)       |

### evidence
Observations or external information. **Never** an AI conclusion.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| human_id            | text          | EVD-041                        |
| evidence_type       | text          | interview / email / experiment_result / market_data / competitor / technical_test / external_source / other |
| title               | text          |                                |
| content             | text          | the observation                |
| source              | text          | who/where it came from         |
| source_url          | text?         |                                |
| collected_at        | timestamptz   | when the observation happened  |
| created_by          | text          |                                |
| created_at          | timestamptz   |                                |
| metadata            | jsonb         | flexible structured data       |

### evidence_hypothesis_links
Many-to-many with direction.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| evidence_id         | uuid FK       |                                |
| hypothesis_id       | uuid FK       |                                |
| relationship        | text          | supports / contradicts / neutral |
| created_at          | timestamptz   |                                |
| created_by          | text          |                                |

Primary key: (evidence_id, hypothesis_id)

### analyses
Reasoning performed by a human or agent. References evidence and hypotheses.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| human_id            | text          | ANL-028                        |
| author              | text          | "human:bob" or "agent:critic"  |
| summary             | text          | short                          |
| full_text           | text          | full reasoning                 |
| confidence          | text          | unknown / weak / medium / strong |
| assumptions         | text[]        |                                |
| created_at          | timestamptz   |                                |
| metadata            | jsonb         | optional                       |

Analyses are immutable once created. New critique = new analysis.

### analysis_references
Links an analysis to the things it reasons about.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| analysis_id         | uuid FK       |                                |
| ref_type            | text          | evidence / hypothesis / analysis |
| ref_id              | uuid          |                                |

### experiments
Tests of one or more hypotheses.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| human_id            | text          | EXP-007                        |
| objective           | text          |                                |
| methodology         | text          |                                |
| status              | text          | proposed / approved / running / completed / cancelled |
| owner               | text          |                                |
| success_criteria    | text          |                                |
| results_summary     | text?         | filled when completed          |
| start_date          | date?         |                                |
| end_date            | date?         |                                |
| created_by          | text          |                                |
| created_at          | timestamptz   |                                |
| updated_at          | timestamptz   |                                |

### experiment_hypotheses
Which hypotheses an experiment is testing.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| experiment_id       | uuid FK       |                                |
| hypothesis_id       | uuid FK       |                                |

### agent_outputs
Standard envelope + flexible payload. Immutable after insert.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| run_id              | text          | correlation id for a bot run   |
| agent_id            | text          |                                |
| agent_name          | text          |                                |
| agent_provider      | text          | xai / openai / anthropic / human / other |
| agent_role          | text          | ideator / critic / market_researcher / ... |
| output_type         | text          | e.g. critique, market_scan, weekly_review |
| payload_schema      | text          | schema name/version            |
| payload             | jsonb         | the actual content             |
| input_ids           | uuid[]        | what this output was based on  |
| created_at          | timestamptz   |                                |

The envelope is validated against a JSON Schema. Payload schemas can be added without migrations.

### decisions
**Human decisions only.** Agents may propose via agent_outputs or analyses.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| id                  | uuid PK       |                                |
| project_id          | uuid FK       |                                |
| human_id            | text          | DEC-012                        |
| statement           | text          | what was decided               |
| rationale           | text          |                                |
| status              | text          | proposed / accepted / rejected / superseded |
| decided_by          | text          | human identifier               |
| decided_at          | timestamptz   |                                |
| created_at          | timestamptz   |                                |

### decision_references
Links a decision to the artifacts that informed it.

| Column              | Type          | Notes                          |
|---------------------|---------------|--------------------------------|
| decision_id         | uuid FK       |                                |
| ref_type            | text          | hypothesis / evidence / analysis / experiment |
| ref_id              | uuid          |                                |

## Human-readable ID generation

Simple per-project counters (or sequences) for:

- IDEA-###
- HYP-###
- EVD-###
- ANL-###
- EXP-###
- DEC-###

Implemented as a small helper that looks up the next number for the project + type.

## What was deliberately removed for v1

- contacts
- interactions
- weekly_reviews table (generated on demand)
- complex tagging / taxonomy systems
- soft-delete / versioning of content rows (status changes only)
