import { z } from "zod";
import * as ideasRepo from "../../repositories/ideas.js";
import { notifyIdeaCreated } from "../../services/webhooks.js";

export const createIdeaTool = {
  name: "create_idea",
  description: "Create a new idea inside a project. Returns the created idea with its human_id (IDEA-00X).",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    rationale: z.string().optional(),
    parent_idea_id: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    created_by: z.string().min(1).describe("e.g. human:alice or agent:ideator-v1"),
  }),
  handler: async (input: {
    project_id: string;
    title: string;
    description?: string;
    rationale?: string;
    parent_idea_id?: string;
    tags?: string[];
    created_by: string;
  }) => {
    const idea = await ideasRepo.createIdea(input);
    await notifyIdeaCreated(idea);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ created: true, idea }, null, 2),
        },
      ],
    };
  },
};

export const listIdeasTool = {
  name: "list_ideas",
  description: "List ideas in a project",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    status: z.enum(["draft", "active", "parked", "rejected"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  handler: async (input: {
    project_id: string;
    status?: "draft" | "active" | "parked" | "rejected";
    limit?: number;
  }) => {
    const ideas = await ideasRepo.listIdeas(input.project_id, {
      status: input.status,
      limit: input.limit,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(ideas, null, 2) }],
    };
  },
};

export const getIdeaTool = {
  name: "get_idea",
  description: "Get a single idea by UUID or human_id (IDEA-001)",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    idea_id: z.string().describe("UUID or human_id"),
  }),
  handler: async ({ project_id, idea_id }: { project_id: string; idea_id: string }) => {
    const idea = await ideasRepo.getIdea(project_id, idea_id);
    if (!idea) {
      return {
        content: [{ type: "text" as const, text: `Idea not found: ${idea_id}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(idea, null, 2) }],
    };
  },
};
