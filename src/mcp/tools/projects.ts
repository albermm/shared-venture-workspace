import { z } from "zod";
import * as projectsRepo from "../../repositories/projects.js";

export const listProjectsTool = {
  name: "list_projects",
  description: "List all projects in the workspace",
  inputSchema: z.object({}),
  handler: async () => {
    const projects = await projectsRepo.listProjects();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            projects.map((p) => ({
              id: p.id,
              human_id: p.human_id,
              name: p.name,
              status: p.status,
              updated_at: p.updated_at,
            })),
            null,
            2
          ),
        },
      ],
    };
  },
};

export const getProjectTool = {
  name: "get_project",
  description: "Get a project by UUID or human_id (e.g. PROJ-gutter-robot)",
  inputSchema: z.object({
    project_id: z.string().describe("UUID or human_id of the project"),
  }),
  handler: async ({ project_id }: { project_id: string }) => {
    const project = await projectsRepo.getProject(project_id);
    if (!project) {
      return {
        content: [{ type: "text" as const, text: `Project not found: ${project_id}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }],
    };
  },
};

export const getProjectSummaryTool = {
  name: "get_project_summary",
  description:
    "Get a compact summary of recent activity on a project (ideas, hypotheses, evidence). Useful for 'what changed?' questions.",
  inputSchema: z.object({
    project_id: z.string().describe("UUID of the project"),
    since: z
      .string()
      .optional()
      .describe("ISO date – only include items created/updated after this (default: 7 days ago)"),
  }),
  handler: async ({ project_id, since }: { project_id: string; since?: string }) => {
    const summary = await projectsRepo.getProjectSummary(project_id, since);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
    };
  },
};

export const createProjectTool = {
  name: "create_project",
  description: "Create a new project (venture). human_id should be a short slug like 'gutter-robot'.",
  inputSchema: z.object({
    human_id: z.string().min(2).describe("Short unique slug, e.g. gutter-robot"),
    name: z.string().min(1),
    description: z.string().optional(),
    owner: z.string().optional(),
  }),
  handler: async (input: {
    human_id: string;
    name: string;
    description?: string;
    owner?: string;
  }) => {
    // Prefix human_id for consistency
    const humanId = input.human_id.startsWith("PROJ-")
      ? input.human_id
      : `PROJ-${input.human_id}`;

    const project = await projectsRepo.createProject({
      human_id: humanId,
      name: input.name,
      description: input.description,
      owner: input.owner,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ created: true, project }, null, 2),
        },
      ],
    };
  },
};
