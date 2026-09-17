import { z } from "zod";
import * as analysesRepo from "../../repositories/analyses.js";

const confidence = z.enum(["unknown", "weak", "medium", "strong"]);
const refType = z.enum(["evidence", "hypothesis", "analysis"]);

export const createAnalysisTool = {
  name: "create_analysis",
  description:
    "Create an immutable analysis (reasoning by human or agent). References evidence, hypotheses or other analyses. Never treat this as evidence.",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    author: z.string().min(1).describe("e.g. human:alice or agent:critic-v1"),
    summary: z.string().min(1),
    full_text: z.string().min(1),
    confidence: confidence.optional(),
    assumptions: z.array(z.string()).optional(),
    references: z
      .array(
        z.object({
          ref_type: refType,
          ref_id: z.string().uuid(),
        })
      )
      .optional(),
  }),
  handler: async (input: {
    project_id: string;
    author: string;
    summary: string;
    full_text: string;
    confidence?: z.infer<typeof confidence>;
    assumptions?: string[];
    references?: { ref_type: z.infer<typeof refType>; ref_id: string }[];
  }) => {
    const analysis = await analysesRepo.createAnalysis(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ created: true, analysis }, null, 2),
        },
      ],
    };
  },
};

export const listAnalysesTool = {
  name: "list_analyses",
  description: "List analyses in a project (most recent first)",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  handler: async (input: { project_id: string; limit?: number }) => {
    const analyses = await analysesRepo.listAnalyses(input.project_id, {
      limit: input.limit,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(analyses, null, 2) }],
    };
  },
};

export const getAnalysisTool = {
  name: "get_analysis",
  description: "Get a single analysis by UUID, including its references",
  inputSchema: z.object({
    analysis_id: z.string().uuid(),
  }),
  handler: async ({ analysis_id }: { analysis_id: string }) => {
    const result = await analysesRepo.getAnalysis(analysis_id);
    if (!result) {
      return {
        content: [{ type: "text" as const, text: `Analysis not found: ${analysis_id}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
};
