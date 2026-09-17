import { z } from "zod";
import * as hypRepo from "../../repositories/hypotheses.js";

const hypothesisType = z.enum([
  "problem",
  "customer",
  "value_prop",
  "willingness_to_pay",
  "technical",
  "distribution",
  "unit_economics",
  "other",
]);

const confidence = z.enum(["unknown", "weak", "medium", "strong"]);
const hypStatus = z.enum(["open", "supported", "contradicted", "retired"]);

export const createHypothesisTool = {
  name: "create_hypothesis",
  description:
    "Create a new testable hypothesis. Returns the created hypothesis with human_id (HYP-00X).",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    statement: z.string().min(5),
    type: hypothesisType,
    rationale: z.string().optional(),
    confidence: confidence.optional(),
    created_by: z.string().min(1),
  }),
  handler: async (input: {
    project_id: string;
    statement: string;
    type: z.infer<typeof hypothesisType>;
    rationale?: string;
    confidence?: z.infer<typeof confidence>;
    created_by: string;
  }) => {
    const hypothesis = await hypRepo.createHypothesis(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ created: true, hypothesis }, null, 2),
        },
      ],
    };
  },
};

export const listHypothesesTool = {
  name: "list_hypotheses",
  description: "List hypotheses in a project with optional filters",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    status: hypStatus.optional(),
    type: hypothesisType.optional(),
    confidence: confidence.optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  handler: async (input: {
    project_id: string;
    status?: z.infer<typeof hypStatus>;
    type?: z.infer<typeof hypothesisType>;
    confidence?: z.infer<typeof confidence>;
    limit?: number;
  }) => {
    const hypotheses = await hypRepo.listHypotheses(input.project_id, input);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(hypotheses, null, 2) }],
    };
  },
};

export const getHypothesisTool = {
  name: "get_hypothesis",
  description:
    "Get a hypothesis by UUID or human_id, including linked evidence summary",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    hypothesis_id: z.string().describe("UUID or human_id (HYP-014)"),
  }),
  handler: async ({
    project_id,
    hypothesis_id,
  }: {
    project_id: string;
    hypothesis_id: string;
  }) => {
    const hyp = await hypRepo.getHypothesis(project_id, hypothesis_id);
    if (!hyp) {
      return {
        content: [{ type: "text" as const, text: `Hypothesis not found: ${hypothesis_id}` }],
        isError: true,
      };
    }

    const withEvidence = await hypRepo.getHypothesisWithEvidence(hyp.id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(withEvidence, null, 2),
        },
      ],
    };
  },
};

export const updateHypothesisStatusTool = {
  name: "update_hypothesis_status",
  description:
    "Update only the status and/or confidence of a hypothesis. Does not change the statement.",
  inputSchema: z.object({
    hypothesis_id: z.string().uuid(),
    status: hypStatus,
    confidence: confidence.optional(),
    updated_by: z.string().min(1),
  }),
  handler: async (input: {
    hypothesis_id: string;
    status: z.infer<typeof hypStatus>;
    confidence?: z.infer<typeof confidence>;
    updated_by: string;
  }) => {
    const hypothesis = await hypRepo.updateHypothesisStatus(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ updated: true, hypothesis }, null, 2),
        },
      ],
    };
  },
};
