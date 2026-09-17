import { getSupabase } from "../lib/supabase.js";
import { allocateHumanId, ID_PREFIXES } from "../lib/ids.js";
import type { Analysis, AnalysisRefType, Confidence } from "../domain/types.js";

export async function createAnalysis(input: {
  project_id: string;
  author: string;
  summary: string;
  full_text: string;
  confidence?: Confidence;
  assumptions?: string[];
  references?: { ref_type: AnalysisRefType; ref_id: string }[];
  metadata?: Record<string, unknown>;
}): Promise<Analysis> {
  const humanId = await allocateHumanId(
    input.project_id,
    "analysis",
    ID_PREFIXES.analysis
  );

  const sb = getSupabase();

  const { data, error } = await sb
    .from("analyses")
    .insert({
      project_id: input.project_id,
      human_id: humanId,
      author: input.author,
      summary: input.summary,
      full_text: input.full_text,
      confidence: input.confidence ?? "unknown",
      assumptions: input.assumptions ?? [],
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`createAnalysis: ${error.message}`);

  const analysis = data as Analysis;

  // Insert references if provided
  if (input.references && input.references.length > 0) {
    const rows = input.references.map((r) => ({
      analysis_id: analysis.id,
      ref_type: r.ref_type,
      ref_id: r.ref_id,
    }));

    const { error: refErr } = await sb.from("analysis_references").insert(rows);
    if (refErr) throw new Error(`createAnalysis references: ${refErr.message}`);
  }

  return analysis;
}

export async function listAnalyses(
  projectId: string,
  opts: { limit?: number } = {}
): Promise<Analysis[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("analyses")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (error) throw new Error(`listAnalyses: ${error.message}`);
  return (data ?? []) as Analysis[];
}

export async function getAnalysis(id: string): Promise<{
  analysis: Analysis;
  references: { ref_type: AnalysisRefType; ref_id: string }[];
} | null> {
  const sb = getSupabase();

  const { data, error } = await sb
    .from("analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAnalysis: ${error.message}`);
  if (!data) return null;

  const { data: refs, error: refErr } = await sb
    .from("analysis_references")
    .select("ref_type, ref_id")
    .eq("analysis_id", id);

  if (refErr) throw new Error(`getAnalysis refs: ${refErr.message}`);

  return {
    analysis: data as Analysis,
    references: (refs ?? []) as { ref_type: AnalysisRefType; ref_id: string }[],
  };
}

export async function getAnalysisByHumanId(
  projectId: string,
  humanId: string
): Promise<{
  analysis: Analysis;
  references: { ref_type: AnalysisRefType; ref_id: string }[];
} | null> {
  const sb = getSupabase();

  const { data, error } = await sb
    .from("analyses")
    .select("*")
    .eq("project_id", projectId)
    .eq("human_id", humanId)
    .maybeSingle();

  if (error) throw new Error(`getAnalysisByHumanId: ${error.message}`);
  if (!data) return null;

  const { data: refs, error: refErr } = await sb
    .from("analysis_references")
    .select("ref_type, ref_id")
    .eq("analysis_id", data.id);

  if (refErr) throw new Error(`getAnalysisByHumanId refs: ${refErr.message}`);

  return {
    analysis: data as Analysis,
    references: (refs ?? []) as { ref_type: AnalysisRefType; ref_id: string }[],
  };
}
