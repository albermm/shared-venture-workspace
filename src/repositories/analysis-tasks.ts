import { getSupabase } from "../lib/supabase.js";
import type { AnalysisTask, AnalysisTaskStatus } from "../domain/types.js";

export async function createAnalysisTask(input: {
  project_id: string;
  idea_id: string;
  requested_by: string;
  prompt: string;
}): Promise<AnalysisTask> {
  const { data, error } = await getSupabase()
    .from("analysis_tasks")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`createAnalysisTask: ${error.message}`);
  return data as AnalysisTask;
}

export async function listAnalysisTasks(
  projectId: string,
  status?: AnalysisTaskStatus
): Promise<AnalysisTask[]> {
  let query = getSupabase()
    .from("analysis_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`listAnalysisTasks: ${error.message}`);
  return (data ?? []) as AnalysisTask[];
}

export async function claimAnalysisTask(id: string, assignedTo: string): Promise<AnalysisTask> {
  const { data, error } = await getSupabase()
    .from("analysis_tasks")
    .update({ status: "claimed", assigned_to: assignedTo, claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (error) throw new Error(`claimAnalysisTask: ${error.message}`);
  if (!data) throw new Error("Analysis task is not pending or does not exist");
  return data as AnalysisTask;
}

export async function completeAnalysisTask(
  id: string,
  resultAnalysisId: string,
  completedBy: string
): Promise<AnalysisTask> {
  const { data, error } = await getSupabase()
    .from("analysis_tasks")
    .update({
      status: "completed",
      result_analysis_id: resultAnalysisId,
      assigned_to: completedBy,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["claimed", "pending"])
    .select()
    .maybeSingle();
  if (error) throw new Error(`completeAnalysisTask: ${error.message}`);
  if (!data) throw new Error("Analysis task is already completed/cancelled or does not exist");
  return data as AnalysisTask;
}
