# Shared Venture Workspace (v0.2)

A lightweight shared workspace for remote friends + Grok (and other) agents to collaboratively develop business ideas.

**Core loop:** Ideas → Hypotheses → Experiments → Evidence → Analysis → Decisions

## How you store & run it

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → run the files in `supabase/migrations/` in filename order. Existing v0.2 projects only need `20260918000001_experiment_altered_by.sql`.
3. Copy **Project URL** and **service_role** key (Settings → API)

### 2. This repository

```bash
npm install
cp .env.example .env
```

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # service_role – keep secret
MCP_API_KEY=some-long-random-string
PORT=3100                                 # only needed for HTTP mode
```

### 3. Run modes

**Local (stdio) – for Codex / Cursor / Claude Desktop**

```bash
npm run dev
```

**HTTP – for remote Grok bots**

```bash
npm run dev:http
# or after build: npm run start:http
```

Server listens on `http://0.0.0.0:3100`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/tools`  | GET | List all tools |
| `/call`   | POST | Call a tool |

**Call example:**

```bash
curl -X POST http://localhost:3100/call \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-mcp-api-key" \
  -d '{
    "tool": "list_projects",
    "arguments": {}
  }'
```

### 4. Connect Codex / Cursor (local stdio)

```json
{
  "mcpServers": {
    "venture-workspace": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/src/mcp/server.ts"],
      "env": {
        "SUPABASE_URL": "https://xxxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ...",
        "MCP_API_KEY": "your-key"
      }
    }
  }
}
```

### 5. Remote Grok bots

Deploy the same process to Railway / Fly.io / Render (set `PORT` and the env vars).  
Give bots:

- Base URL (e.g. `https://your-app.up.railway.app`)
- `MCP_API_KEY`

They call `POST /call` with `{ "tool": "...", "arguments": { ... } }` and header `X-API-Key`.

For Render, create a Blueprint from this repository's `render.yaml`. Enter
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MCP_API_KEY` when prompted.
Render supplies `PORT`; no `.env` file is deployed. The public `/health`
endpoint is used for health checks, while `/tools` and `/call` require the API
key. This HTTP wrapper uses simple JSON endpoints rather than MCP over HTTP.

---

## Available MCP tools (Slice 1 + 2)

| Area | Tools |
|------|-------|
| Projects | `list_projects`, `get_project`, `get_project_summary`, `create_project` |
| Ideas | `create_idea`, `list_ideas`, `get_idea` |
| Hypotheses | `create_hypothesis`, `list_hypotheses`, `get_hypothesis`, `update_hypothesis_status` |
| Evidence | `create_evidence`, `link_evidence_to_hypothesis`, `list_evidence`, `get_evidence` |
| Analyses | `create_analysis`, `list_analyses`, `get_analysis` |
| Experiments | `create_experiment`, `list_experiments`, `get_experiment`, `update_experiment_status` |

Human-readable IDs (`IDEA-001`, `HYP-014`, `ANL-003`, `EXP-007` …) are allocated automatically.

## Design docs

- [Architecture](docs/architecture.md)
- [Domain Model](docs/domain-model.md)
- [MCP Interface](docs/mcp-interface.md)

## Next slices

3. Agent output envelope + schemas  
4. Slack notifications  
5. Weekly review data tool  
6. Hardening

## Security

- Supabase **service_role** key stays only on the MCP server.
- Remote callers must send `X-API-Key` or `Authorization: Bearer <key>`.
