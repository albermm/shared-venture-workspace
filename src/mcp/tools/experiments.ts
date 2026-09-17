import { z } from "zod";
import * as expRepo from "../../repositories/experiments.js";

const experimentStatus = z.enum([
  "proposed",
  "approved",
  "running",
  "completed",
  "cancelled",
]);

export const createExperimentTool = {
  name: "create_experiment",
  description:
    "Create an experiment that tests one or more hypotheses. Starts in status 'proposed'.",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    objective: z.string().min(1),
    methodology: z.string().optional(),
    hypothesis_ids: z.array(z.string().uuid()).optional(),
    owner: z.string().optional(),
    success_criteria: z.string().optional(),
    created_by: z.string().min(1),
  }),
  handler: async (input: {
    project_id: string;
    objective: string;
    methodology?: string;
    hypothesis_ids?: string[];
    owner?: string;
    success_criteria?: string;
    created_by: string;
  }) => {
    const experiment = await expRepo.createExperiment(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ created: true, experiment }, null, 2),
        },
      ],
    };
  },
};

export const listExperimentsTool = {
  name: "list_experiments",
  description: "List experiments in a project",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    status: experimentStatus.optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  handler: async (input: {
    project_id: string;
    status?: z.infer<typeof experimentStatus>;
    limit?: number;
  }) => {
    const experiments = await expRepo.listExperiments(input.project_id, {
      status: input.status,
      limit: input.limit,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(experiments, null, 2) }],
    };
  },
};

export const getExperimentTool = {
  name: "get_experiment",
  description: "Get an experiment by UUID, including linked hypothesis IDs",
  inputSchema: z.object({
    experiment_id: z.string().uuid(),
  }),
  handler: async ({ experiment_id }: { experiment_id: string }) => {
    const result = await expRepo.getExperiment(experiment_id);
    if (!result) {
      return {
        content: [
          { type: "text" as const, text: `Experiment not found: ${experiment_id}` },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
};

export const updateExperimentStatusTool = {
  name: "update_experiment_status",
  description:
    "Update experiment status and record who made the change (optionally set results_summary, start_date, end_date)",
  inputSchema: z.object({
    experiment_id: z.string().uuid(),
    status: experimentStatus,
    results_summary: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    updated_by: z.string().min(1),
  }),
  handler: async (input: {
    experiment_id: string;
    status: z.infer<typeof experimentStatus>;
    results_summary?: string;
    start_date?: string;
    end_date?: string;
    updated_by: string;
  }) => {
    const experiment = await expRepo.updateExperimentStatus(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ updated: true, experiment }, null, 2),
        },
      ],
    };
  },
};
