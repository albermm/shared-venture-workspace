import { getSupabase } from "../lib/supabase.js";
import { allocateHumanId, ID_PREFIXES } from "../lib/ids.js";
import type { Experiment, ExperimentStatus } from "../domain/types.js";

export async function createExperiment(input: {
  project_id: string;
  objective: string;
  methodology?: string;
  hypothesis_ids?: string[];
  owner?: string;
  success_criteria?: string;
  created_by: string;
}): Promise<Experiment> {
  const humanId = await allocateHumanId(
    input.project_id,
    "experiment",
    ID_PREFIXES.experiment
  );

  const sb = getSupabase();

  const { data, error } = await sb
    .from("experiments")
    .insert({
      project_id: input.project_id,
      human_id: humanId,
      objective: input.objective,
      methodology: input.methodology ?? null,
      owner: input.owner ?? null,
      success_criteria: input.success_criteria ?? null,
      status: "proposed",
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw new Error(`createExperiment: ${error.message}`);

  const experiment = data as Experiment;

  if (input.hypothesis_ids && input.hypothesis_ids.length > 0) {
    const rows = input.hypothesis_ids.map((hid) => ({
      experiment_id: experiment.id,
      hypothesis_id: hid,
    }));

    const { error: linkErr } = await sb.from("experiment_hypotheses").insert(rows);
    if (linkErr) throw new Error(`createExperiment links: ${linkErr.message}`);
  }

  return experiment;
}

export async function listExperiments(
  projectId: string,
  opts: { status?: ExperimentStatus; limit?: number } = {}
): Promise<Experiment[]> {
  const sb = getSupabase();
  let q = sb
    .from("experiments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) throw new Error(`listExperiments: ${error.message}`);
  return (data ?? []) as Experiment[];
}

export async function getExperiment(id: string): Promise<{
  experiment: Experiment;
  hypothesis_ids: string[];
} | null> {
  const sb = getSupabase();

  const { data, error } = await sb
    .from("experiments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getExperiment: ${error.message}`);
  if (!data) return null;

  const { data: links, error: linkErr } = await sb
    .from("experiment_hypotheses")
    .select("hypothesis_id")
    .eq("experiment_id", id);

  if (linkErr) throw new Error(`getExperiment links: ${linkErr.message}`);

  return {
    experiment: data as Experiment,
    hypothesis_ids: (links ?? []).map((l) => l.hypothesis_id),
  };
}

export async function updateExperimentStatus(input: {
  experiment_id: string;
  status: ExperimentStatus;
  results_summary?: string;
  start_date?: string;
  end_date?: string;
  updated_by: string;
}): Promise<Experiment> {
  const sb = getSupabase();

  const updates: Record<string, unknown> = {
    status: input.status,
    altered_by: input.updated_by,
  };
  if (input.results_summary !== undefined) {
    updates.results_summary = input.results_summary;
  }
  if (input.start_date !== undefined) updates.start_date = input.start_date;
  if (input.end_date !== undefined) updates.end_date = input.end_date;

  const { data, error } = await sb
    .from("experiments")
    .update(updates)
    .eq("id", input.experiment_id)
    .select()
    .single();

  if (error) throw new Error(`updateExperimentStatus: ${error.message}`);
  return data as Experiment;
}
