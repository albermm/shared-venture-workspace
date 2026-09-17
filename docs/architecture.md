# Architecture – Shared Venture Workspace (v1 Simplified)

## Purpose

A lightweight, shared workspace that lets one owner + two collaborators (and their Grok / Codex / Claude agents) collaboratively develop business ideas through a clean cycle:

**Ideas → Hypotheses → Experiments → Evidence → Analysis → Decisions**

The system is deliberately small. It is **not** a generic multi-agent chat platform.

## Design Goals

- One person owns and operates the instance.
- Two friends connect primarily via a shared Slack channel + their own Grok bots.
- Grok bots (and later other agents) interact through a small, stable MCP interface.
- PostgreSQL (Supabase) is the single source of truth.
- Evidence is never confused with analysis.
- Agent recommendations are never treated as final human decisions.
- Published agent outputs are immutable.
- Everything important has clear provenance.
- Minimal infrastructure: no Redis, Kafka, vector DB, Temporal, LangChain, etc.

## High-Level Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Slack Channel  │────▶│  (optional thin  │────▶│                 │
│  (idea capture) │     │   webhook/bridge)│     │                 │
└─────────────────┘     └──────────────────┘     │   Supabase      │
                                                 │   (PostgreSQL)  │
┌─────────────────┐     ┌──────────────────┐     │                 │
│  Grok bots      │────▶│                  │────▶│  - projects     │
│  Codex          │     │   MCP Server     │     │  - ideas        │
│  (future agents)│◀────│   (TypeScript)   │◀────│  - hypotheses   │
└─────────────────┘     │                  │     │  - evidence     │
                        │  - small toolset │     │  - analyses     │
┌─────────────────┐     │  - validation    │     │  - experiments  │
│  Humans         │────▶│  - provenance    │     │  - agent_outputs│
│  (direct query) │     └──────────────────┘     │  - decisions    │
└─────────────────┘                              └─────────────────┘
                                                          │
                                                          ▼
                                                 Slack notifications
                                                 (high-signal only)
```

## Key Decisions

### 1. Ownership model
- Single Supabase project owned by one person.
- Friends get access via:
  - Shared Slack channel (primary human interface)
  - Their Grok bots pointed at the same MCP endpoint (with project-scoped API keys if desired)
- No multi-tenant complexity in v1.

### 2. Agent interface = MCP only
- Agents never talk directly to the database.
- All reads/writes go through a deliberately small set of domain tools.
- This keeps Grok context windows clean and makes the contract stable.

### 3. Slack role
- Primary place humans drop new ideas, notes, and customer comments.
- Outbound notifications for high-signal events only (new strong evidence, confidence changes, decision required, weekly review ready).
- Inbound Slack → idea/evidence creation can be added later as a thin bridge. Not required for day-1 usefulness.

### 4. No contacts/CRM in v1
Customer discovery is important but can live in Slack threads or a simple shared spreadsheet for the first months. Adding a full Contact/Interaction model now would bloat the system before it is proven useful.

### 5. Weekly review
Generated on demand by a Grok bot that:
1. Calls `get_weekly_review_data`
2. Receives a clean structured payload
3. Produces markdown following a fixed template
4. Optionally publishes the result as an `agent_output` and posts to Slack

No complex aggregation engine required.

### 6. Technology choices
- **Language**: TypeScript (Node.js)
- **MCP**: Official MCP TypeScript SDK
- **Database**: Supabase (hosted Postgres + Auth + RLS)
- **Validation**: JSON Schema for agent envelopes + selected payloads
- **Deployment**: MCP server on Railway / Fly.io / Render (or a small VPS)
- **Secrets**: Environment variables only

## Repository Structure

```
/
├── docs/
│   ├── architecture.md
│   ├── domain-model.md
│   └── mcp-interface.md
├── contracts/
│   ├── envelope.schema.json
│   └── payloads/
├── prompts/
│   ├── ideator.md
│   ├── critic.md
│   ├── market-researcher.md
│   └── weekly-synthesizer.md
├── src/
│   ├── mcp/           # MCP server + tools
│   ├── domain/        # pure domain logic
│   ├── repositories/  # Supabase access
│   ├── services/      # higher-level orchestration
│   ├── integrations/  # Slack, etc.
│   └── validation/
├── supabase/
│   └── migrations/
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Vertical Slice Order

1. **Slice 1** – Projects + Ideas + Hypotheses + Evidence + basic MCP read/write
2. **Slice 2** – Analyses + Experiments + provenance rules
3. **Slice 3** – Flexible agent_output envelope + schemas
4. **Slice 4** – Slack notifications (outbound)
5. **Slice 5** – Weekly review data tool + prompt
6. **Slice 6** – Security hardening, docs, deployment notes

## Security (v1)

- Supabase service-role key lives **only** on the MCP server.
- Agents authenticate to the MCP server with a simple API key (or project-scoped keys).
- RLS can be enabled later for direct human access if needed.
- Customer PII is not stored in v1 (no contacts table).
- All secrets via environment variables.

## What this deliberately does **not** include

- Vector search / embeddings
- Multi-agent orchestration framework
- Automatic outreach sending
- Full CRM
- Complex permission matrix
- Real-time collaboration features
- Background job queues

These can be added later if a clear need appears.
