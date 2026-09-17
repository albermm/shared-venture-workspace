import { getSupabase } from "./supabase.js";

/**
 * Allocate the next human-readable ID for a project + entity type.
 * Uses the allocate_human_id Postgres function defined in the migration.
 */
export async function allocateHumanId(
  projectId: string,
  entityType: string,
  prefix: string
): Promise<string> {
  const sb = getSupabase();

  const { data, error } = await sb.rpc("allocate_human_id", {
    p_project_id: projectId,
    p_entity_type: entityType,
    p_prefix: prefix,
  });

  if (error) {
    throw new Error(`Failed to allocate human ID: ${error.message}`);
  }

  return data as string;
}

export const ID_PREFIXES = {
  idea: "IDEA",
  hypothesis: "HYP",
  evidence: "EVD",
  analysis: "ANL",
  experiment: "EXP",
  decision: "DEC",
} as const;
