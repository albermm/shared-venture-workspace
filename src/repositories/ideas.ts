import { getSupabase } from "../lib/supabase.js";
import { allocateHumanId, ID_PREFIXES } from "../lib/ids.js";
import type { Idea, IdeaStatus } from "../domain/types.js";

export async function createIdea(input: {
  project_id: string;
  title: string;
  description?: string;
  rationale?: string;
  parent_idea_id?: string;
  tags?: string[];
  created_by: string;
  status?: IdeaStatus;
}): Promise<Idea> {
  const humanId = await allocateHumanId(input.project_id, "idea", ID_PREFIXES.idea);

  const sb = getSupabase();
  const { data, error } = await sb
    .from("ideas")
    .insert({
      project_id: input.project_id,
      human_id: humanId,
      title: input.title,
      description: input.description ?? null,
      rationale: input.rationale ?? null,
      parent_idea_id: input.parent_idea_id ?? null,
      tags: input.tags ?? [],
      created_by: input.created_by,
      status: input.status ?? "draft",
    })
    .select()
    .single();

  if (error) throw new Error(`createIdea: ${error.message}`);
  return data as Idea;
}

export async function listIdeas(
  projectId: string,
  opts: { status?: IdeaStatus; limit?: number } = {}
): Promise<Idea[]> {
  const sb = getSupabase();
  let q = sb
    .from("ideas")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) throw new Error(`listIdeas: ${error.message}`);
  return (data ?? []) as Idea[];
}

export async function getIdea(
  projectId: string,
  idOrHumanId: string
): Promise<Idea | null> {
  const sb = getSupabase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrHumanId);

  const q = sb.from("ideas").select("*").eq("project_id", projectId);
  const { data, error } = isUuid
    ? await q.eq("id", idOrHumanId).maybeSingle()
    : await q.eq("human_id", idOrHumanId).maybeSingle();

  if (error) throw new Error(`getIdea: ${error.message}`);
  return data as Idea | null;
}
