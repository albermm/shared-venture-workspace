#!/usr/bin/env node
/**
 * MCP Server for Shared Venture Workspace
 *
 * Supports two transports:
 *   - stdio  (default)  → for local Codex / Cursor / Claude Desktop
 *   - HTTP   (PORT env) → for remote Grok bots
 *
 * Tools (Slice 1 + 2):
 *   Projects, Ideas, Hypotheses, Evidence, Analyses, Experiments
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

import {
  listProjectsTool,
  getProjectTool,
  getProjectSummaryTool,
  createProjectTool,
} from "./tools/projects.js";
import { createIdeaTool, listIdeasTool, getIdeaTool } from "./tools/ideas.js";
import {
  createHypothesisTool,
  listHypothesesTool,
  getHypothesisTool,
  updateHypothesisStatusTool,
} from "./tools/hypotheses.js";
import {
  createEvidenceTool,
  linkEvidenceToHypothesisTool,
  listEvidenceTool,
  getEvidenceTool,
} from "./tools/evidence.js";
import {
  createAnalysisTool,
  listAnalysesTool,
  getAnalysisTool,
} from "./tools/analyses.js";
import {
  createExperimentTool,
  listExperimentsTool,
  getExperimentTool,
  updateExperimentStatusTool,
} from "./tools/experiments.js";

const REQUIRED_API_KEY = process.env.MCP_API_KEY;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

type ToolDef = {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (args: any) => Promise<any>;
};

const tools: ToolDef[] = [
  // Projects
  listProjectsTool,
  getProjectTool,
  getProjectSummaryTool,
  createProjectTool,
  // Ideas
  createIdeaTool,
  listIdeasTool,
  getIdeaTool,
  // Hypotheses
  createHypothesisTool,
  listHypothesesTool,
  getHypothesisTool,
  updateHypothesisStatusTool,
  // Evidence
  createEvidenceTool,
  linkEvidenceToHypothesisTool,
  listEvidenceTool,
  getEvidenceTool,
  // Analyses (Slice 2)
  createAnalysisTool,
  listAnalysesTool,
  getAnalysisTool,
  // Experiments (Slice 2)
  createExperimentTool,
  listExperimentsTool,
  getExperimentTool,
  updateExperimentStatusTool,
];

function zodToJsonSchema(schema: z.ZodObject<any>) {
  const shape = schema.shape;
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodVal = value as z.ZodTypeAny;
    let type = "string";
    let description: string | undefined;
    let enumValues: string[] | undefined;

    let inner: any = zodVal;
    if (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault) {
      inner = inner._def.innerType;
    }

    if (inner instanceof z.ZodString) type = "string";
    else if (inner instanceof z.ZodNumber) type = "number";
    else if (inner instanceof z.ZodBoolean) type = "boolean";
    else if (inner instanceof z.ZodEnum) {
      type = "string";
      enumValues = inner._def.values;
    } else if (inner instanceof z.ZodArray) type = "array";
    else if (inner instanceof z.ZodRecord || inner instanceof z.ZodObject) type = "object";

    description = zodVal.description;
    properties[key] = { type };
    if (description) properties[key].description = description;
    if (enumValues) properties[key].enum = enumValues;

    if (!(zodVal instanceof z.ZodOptional) && !(zodVal instanceof z.ZodDefault)) {
      required.push(key);
    }
  }

  return {
    type: "object" as const,
    properties,
    required: required.length ? required : undefined,
  };
}

function createMcpServer() {
  const server = new Server(
    { name: "shared-venture-workspace", version: "0.2.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
    try {
      const parsed = tool.inputSchema.parse(args ?? {});
      return await tool.handler(parsed);
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Error in ${name}: ${err?.message ?? String(err)}` }],
        isError: true,
      };
    }
  });

  return server;
}

async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body too large");
  }
  return body;
}

function webhookSignatureIsValid(body: string, signature: string | undefined): boolean {
  const secret = process.env.GROK_WEBHOOK_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const supplied = Buffer.from(signature.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", secret).update(body).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Minimal HTTP JSON-RPC style endpoint for remote agents */
function startHttpServer() {
  if (!REQUIRED_API_KEY) {
    throw new Error("MCP_API_KEY is required in HTTP mode");
  }
  const mcp = createMcpServer();

  const httpServer = http.createServer(async (req, res) => {
    // CORS for browser-based tools if ever needed
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", name: "shared-venture-workspace", version: "0.2.0" }));
      return;
    }

    // Signed inbound bot events. This route intentionally uses its own
    // HMAC authentication rather than the MCP API key.
    if (req.method === "POST" && req.url === "/webhooks/venture") {
      try {
        const body = await readRequestBody(req);
        const signature = Array.isArray(req.headers["x-webhook-signature"])
          ? req.headers["x-webhook-signature"][0]
          : req.headers["x-webhook-signature"];
        if (!webhookSignatureIsValid(body, signature)) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid webhook signature" }));
          return;
        }

        const event = JSON.parse(body);
        if (event?.event !== "idea.created" || !event?.data?.idea) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Expected an idea.created event" }));
          return;
        }

        // This is the handoff point for bot processing. The event is
        // acknowledged here; bot-specific processing can be added without
        // changing the MCP or webhook contract.
        console.error(`Received webhook ${event.event} (${event.event_id})`);
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accepted: true, event_id: event.event_id }));
      } catch (error: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error?.message ?? "Invalid webhook payload" }));
      }
      return;
    }

    // API key check
    if (REQUIRED_API_KEY) {
      const auth =
        req.headers["x-api-key"] ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);
      if (auth !== REQUIRED_API_KEY) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized – provide X-API-Key or Bearer token" }));
        return;
      }
    }

    if (req.method === "GET" && req.url === "/tools") {
      // List tools
      const toolList = tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: zodToJsonSchema(t.inputSchema),
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tools: toolList }));
      return;
    }

    if (req.method === "POST" && (req.url === "/call" || req.url === "/mcp" || req.url === "/")) {
      const body = await readRequestBody(req);

      try {
        const parsed = JSON.parse(body);
        // Accept either { tool, arguments } or MCP-style { method, params }
        let toolName: string;
        let toolArgs: any;

        if (parsed.tool || parsed.name) {
          toolName = parsed.tool || parsed.name;
          toolArgs = parsed.arguments || parsed.args || parsed.params || {};
        } else if (parsed.method === "tools/call" && parsed.params) {
          toolName = parsed.params.name;
          toolArgs = parsed.params.arguments || {};
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Expected { tool, arguments } or MCP tools/call payload" }));
          return;
        }

        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Unknown tool: ${toolName}` }));
          return;
        }

        const validated = tool.inputSchema.parse(toolArgs ?? {});
        const result = await tool.handler(validated);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err?.message ?? String(err) }));
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use GET /health, GET /tools, POST /call" }));
  });

  httpServer.listen(PORT, () => {
    console.error(`Shared Venture Workspace HTTP MCP listening on http://0.0.0.0:${PORT}`);
    console.error(`  GET  /health`);
    console.error(`  GET  /tools`);
    console.error(`  POST /call   { "tool": "...", "arguments": { ... } }`);
    if (REQUIRED_API_KEY) console.error(`  Auth: X-API-Key or Authorization: Bearer <key>`);
  });
}

async function main() {
  if (PORT) {
    // HTTP mode for remote bots
    startHttpServer();
  } else {
    // stdio mode for local Codex / Cursor
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Shared Venture Workspace MCP server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
