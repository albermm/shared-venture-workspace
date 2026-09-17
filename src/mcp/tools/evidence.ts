import { z } from "zod";
import * as evidenceRepo from "../../repositories/evidence.js";

const evidenceType = z.enum([
  "interview",
  "email",
  "experiment_result",
  "market_data",
  "competitor",
  "technical_test",
  "external_source",
  "other",
]);

const relationship = z.enum(["supports", "contradicts", "neutral"]);

export const createEvidenceTool = {
  name: "create_evidence",
  description:
    "Create a new evidence record (observation or external fact). Never put AI conclusions here — those belong in analyses.",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    evidence_type: evidenceType,
    title: z.string().min(1),
    content: z.string().min(1),
    source: z.string().optional(),
    source_url: z.string().url().optional().or(z.literal("")),
    collected_at: z.string().datetime().optional(),
    created_by: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  }),
  handler: async (input: {
    project_id: string;
    evidence_type: z.infer<typeof evidenceType>;
    title: string;
    content: string;
    source?: string;
    source_url?: string;
    collected_at?: string;
    created_by: string;
    metadata?: Record<string, unknown>;
  }) => {
    // Clean empty source_url
    if (input.source_url === "") delete input.source_url;

    const evidence = await evidenceRepo.createEvidence(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ created: true, evidence }, null, 2),
        },
      ],
    };
  },
};

export const linkEvidenceToHypothesisTool = {
  name: "link_evidence_to_hypothesis",
  description:
    "Link an evidence record to a hypothesis as supports / contradicts / neutral",
  inputSchema: z.object({
    evidence_id: z.string().uuid(),
    hypothesis_id: z.string().uuid(),
    relationship: relationship,
    created_by: z.string().min(1),
  }),
  handler: async (input: {
    evidence_id: string;
    hypothesis_id: string;
    relationship: z.infer<typeof relationship>;
    created_by: string;
  }) => {
    await evidenceRepo.linkEvidenceToHypothesis(input);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ linked: true, ...input }, null, 2),
        },
      ],
    };
  },
};

export const listEvidenceTool = {
  name: "list_evidence",
  description: "List evidence records in a project",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    evidence_type: evidenceType.optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  handler: async (input: {
    project_id: string;
    evidence_type?: z.infer<typeof evidenceType>;
    limit?: number;
  }) => {
    const evidence = await evidenceRepo.listEvidence(input.project_id, {
      evidence_type: input.evidence_type,
      limit: input.limit,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(evidence, null, 2) }],
    };
  },
};

export const getEvidenceTool = {
  name: "get_evidence",
  description: "Get a single evidence record by UUID",
  inputSchema: z.object({
    evidence_id: z.string().uuid(),
  }),
  handler: async ({ evidence_id }: { evidence_id: string }) => {
    const evidence = await evidenceRepo.getEvidence(evidence_id);
    if (!evidence) {
      return {
        content: [{ type: "text" as const, text: `Evidence not found: ${evidence_id}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(evidence, null, 2) }],
    };
  },
};
