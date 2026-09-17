import { getSupabase } from "../lib/supabase.js";
import type { Project, ProjectStatus } from "../domain/types.js";

export async function listProjects(): Promise<Project[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function getProject(idOrHumanId: string): Promise<Project | null> {
  const sb = getSupabase();

  // Try UUID first, then human_id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrHumanId);

  const query = sb.from("projects").select("*");
  const { data, error } = isUuid
    ? await query.eq("id", idOrHumanId).maybeSingle()
    : await query.eq("human_id", idOrHumanId).maybeSingle();

  if (error) throw new Error(`getProject: ${error.message}`);
  return data as Project | null;
}

export async function createProject(input: {
  human_id: string;
  name: string;
  description?: string;
  owner?: string;
  status?: ProjectStatus;
}): Promise<Project> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .insert({
      human_id: input.human_id,
      name: input.name,
      description: input.description ?? null,
      owner: input.owner ?? null,
      status: input.status ?? "active",
    })
    .select()
    .single();

  if (error) throw new Error(`createProject: ${error.message}`);
  return data as Project;
}

export async function getProjectSummary(projectId: string, since?: string) {
  const sb = getSupabase();

  const sinceFilter = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [ideas, hypotheses, evidence] = await Promise.all([
    sb
      .from("ideas")
      .select("id, human_id, title, status, created_at")
      .eq("project_id", projectId)
      .gte("created_at", sinceFilter)
      .order("created_at", { ascending: false })
      .limit(20),
    sb
      .from("hypotheses")
      .select("id, human_id, statement, status, confidence, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(30),
    sb
      .from("evidence")
      .select("id, human_id, title, evidence_type, created_at")
      .eq("project_id", projectId)
      .gte("created_at", sinceFilter)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (ideas.error) throw new Error(ideas.error.message);
  if (hypotheses.error) throw new Error(hypotheses.error.message);
  if (evidence.error) throw new Error(evidence.error.message);

  return {
    since: sinceFilter,
    recent_ideas: ideas.data ?? [],
    open_hypotheses: (hypotheses.data ?? []).filter((h) => h.status === "open"),
    all_hypotheses_sample: hypotheses.data ?? [],
    recent_evidence: evidence.data ?? [],
  };
}
