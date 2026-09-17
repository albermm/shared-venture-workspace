import { getSupabase } from "../lib/supabase.js";
import { allocateHumanId, ID_PREFIXES } from "../lib/ids.js";
import type { Evidence, EvidenceType, EvidenceRelationship } from "../domain/types.js";

export async function createEvidence(input: {
  project_id: string;
  evidence_type: EvidenceType;
  title: string;
  content: string;
  source?: string;
  source_url?: string;
  collected_at?: string;
  created_by: string;
  metadata?: Record<string, unknown>;
}): Promise<Evidence> {
  const humanId = await allocateHumanId(
    input.project_id,
    "evidence",
    ID_PREFIXES.evidence
  );

  const sb = getSupabase();
  const { data, error } = await sb
    .from("evidence")
    .insert({
      project_id: input.project_id,
      human_id: humanId,
      evidence_type: input.evidence_type,
      title: input.title,
      content: input.content,
      source: input.source ?? null,
      source_url: input.source_url ?? null,
      collected_at: input.collected_at ?? null,
      created_by: input.created_by,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`createEvidence: ${error.message}`);
  return data as Evidence;
}

export async function linkEvidenceToHypothesis(input: {
  evidence_id: string;
  hypothesis_id: string;
  relationship: EvidenceRelationship;
  created_by: string;
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("evidence_hypothesis_links").insert({
    evidence_id: input.evidence_id,
    hypothesis_id: input.hypothesis_id,
    relationship: input.relationship,
    created_by: input.created_by,
  });

  if (error) {
    // Ignore duplicate link
    if (error.code === "23505") return;
    throw new Error(`linkEvidenceToHypothesis: ${error.message}`);
  }
}

export async function listEvidence(
  projectId: string,
  opts: { evidence_type?: EvidenceType; limit?: number } = {}
): Promise<Evidence[]> {
  const sb = getSupabase();
  let q = sb
    .from("evidence")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.evidence_type) q = q.eq("evidence_type", opts.evidence_type);

  const { data, error } = await q;
  if (error) throw new Error(`listEvidence: ${error.message}`);
  return (data ?? []) as Evidence[];
}

export async function getEvidence(id: string): Promise<Evidence | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("evidence")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getEvidence: ${error.message}`);
  return data as Evidence | null;
}
