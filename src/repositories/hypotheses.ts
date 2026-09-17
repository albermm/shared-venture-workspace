import { getSupabase } from "../lib/supabase.js";
import { allocateHumanId, ID_PREFIXES } from "../lib/ids.js";
import type {
  Hypothesis,
  HypothesisType,
  HypothesisStatus,
  Confidence,
} from "../domain/types.js";

export async function createHypothesis(input: {
  project_id: string;
  statement: string;
  type: HypothesisType;
  rationale?: string;
  confidence?: Confidence;
  created_by: string;
}): Promise<Hypothesis> {
  const humanId = await allocateHumanId(
    input.project_id,
    "hypothesis",
    ID_PREFIXES.hypothesis
  );

  const sb = getSupabase();
  const { data, error } = await sb
    .from("hypotheses")
    .insert({
      project_id: input.project_id,
      human_id: humanId,
      statement: input.statement,
      type: input.type,
      rationale: input.rationale ?? null,
      confidence: input.confidence ?? "unknown",
      status: "open",
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw new Error(`createHypothesis: ${error.message}`);
  return data as Hypothesis;
}

export async function listHypotheses(
  projectId: string,
  opts: {
    status?: HypothesisStatus;
    type?: HypothesisType;
    confidence?: Confidence;
    limit?: number;
  } = {}
): Promise<Hypothesis[]> {
  const sb = getSupabase();
  let q = sb
    .from("hypotheses")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.status) q = q.eq("status", opts.status);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.confidence) q = q.eq("confidence", opts.confidence);

  const { data, error } = await q;
  if (error) throw new Error(`listHypotheses: ${error.message}`);
  return (data ?? []) as Hypothesis[];
}

export async function getHypothesis(
  projectId: string,
  idOrHumanId: string
): Promise<Hypothesis | null> {
  const sb = getSupabase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrHumanId);

  const q = sb.from("hypotheses").select("*").eq("project_id", projectId);
  const { data, error } = isUuid
    ? await q.eq("id", idOrHumanId).maybeSingle()
    : await q.eq("human_id", idOrHumanId).maybeSingle();

  if (error) throw new Error(`getHypothesis: ${error.message}`);
  return data as Hypothesis | null;
}

export async function updateHypothesisStatus(input: {
  hypothesis_id: string;
  status: HypothesisStatus;
  confidence?: Confidence;
  updated_by: string;
}): Promise<Hypothesis> {
  const sb = getSupabase();

  const updates: Record<string, unknown> = {
    status: input.status,
  };
  if (input.confidence) updates.confidence = input.confidence;

  const { data, error } = await sb
    .from("hypotheses")
    .update(updates)
    .eq("id", input.hypothesis_id)
    .select()
    .single();

  if (error) throw new Error(`updateHypothesisStatus: ${error.message}`);
  return data as Hypothesis;
}

export async function getHypothesisWithEvidence(hypothesisId: string) {
  const sb = getSupabase();

  const { data: hyp, error: hypErr } = await sb
    .from("hypotheses")
    .select("*")
    .eq("id", hypothesisId)
    .single();

  if (hypErr) throw new Error(hypErr.message);

  const { data: links, error: linkErr } = await sb
    .from("evidence_hypothesis_links")
    .select("relationship, evidence:evidence_id(id, human_id, title, evidence_type, content, created_at)")
    .eq("hypothesis_id", hypothesisId);

  if (linkErr) throw new Error(linkErr.message);

  return {
    hypothesis: hyp as Hypothesis,
    evidence_links: links ?? [],
  };
}
