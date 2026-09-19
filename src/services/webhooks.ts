import { createHmac, randomUUID } from "node:crypto";
import type { Idea } from "../domain/types.js";

type IdeaCreatedEvent = {
  event: "idea.created";
  event_id: string;
  occurred_at: string;
  data: {
    idea: Idea;
  };
};

/**
 * Notify an external bot after an idea is persisted. Delivery is best effort:
 * a bot outage must not make the MCP create_idea call fail.
 */
export async function notifyIdeaCreated(idea: Idea): Promise<void> {
  const endpoint = process.env.GROK_WEBHOOK_URL;
  if (!endpoint) return;

  const payload: IdeaCreatedEvent = {
    event: "idea.created",
    event_id: randomUUID(),
    occurred_at: new Date().toISOString(),
    data: { idea },
  };
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-webhook-event": payload.event,
  };
  const secret = process.env.GROK_WEBHOOK_SECRET;
  if (secret) {
    headers["x-webhook-signature"] = `sha256=${createHmac("sha256", secret)
      .update(body)
      .digest("hex")}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Webhook idea.created failed: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("Webhook idea.created delivery failed:", error);
  }
}
