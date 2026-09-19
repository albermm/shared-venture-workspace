import { z } from "zod";
import * as tasksRepo from "../../repositories/analysis-tasks.js";

const taskStatus = z.enum(["pending", "claimed", "completed", "cancelled"]);

export const createAnalysisTaskTool = {
  name: "create_analysis_task",
  description: "Create a pending analysis task for another agent to claim.",
  inputSchema: z.object({
    project_id: z.string().uuid(),
    idea_id: z.string().uuid(),
    requested_by: z.string().min(1),
    prompt: z.string().min(1),
  }),
  handler: async (input: { project_id: string; idea_id: string; requested_by: string; prompt: string }) => ({
    content: [{ type: "text" as const, text: JSON.stringify({ created: true, task: await tasksRepo.createAnalysisTask(input) }, null, 2) }],
  }),
};

export const listAnalysisTasksTool = {
  name: "list_analysis_tasks",
  description: "List analysis tasks, optionally filtered by status.",
  inputSchema: z.object({ project_id: z.string().uuid(), status: taskStatus.optional() }),
  handler: async (input: { project_id: string; status?: z.infer<typeof taskStatus> }) => ({
    content: [{ type: "text" as const, text: JSON.stringify(await tasksRepo.listAnalysisTasks(input.project_id, input.status), null, 2) }],
  }),
};

export const claimAnalysisTaskTool = {
  name: "claim_analysis_task",
  description: "Atomically claim a pending analysis task for this agent.",
  inputSchema: z.object({ task_id: z.string().uuid(), assigned_to: z.string().min(1) }),
  handler: async (input: { task_id: string; assigned_to: string }) => ({
    content: [{ type: "text" as const, text: JSON.stringify({ claimed: true, task: await tasksRepo.claimAnalysisTask(input.task_id, input.assigned_to) }, null, 2) }],
  }),
};

export const completeAnalysisTaskTool = {
  name: "complete_analysis_task",
  description: "Mark an analysis task complete and attach the resulting analysis UUID.",
  inputSchema: z.object({ task_id: z.string().uuid(), result_analysis_id: z.string().uuid(), completed_by: z.string().min(1) }),
  handler: async (input: { task_id: string; result_analysis_id: string; completed_by: string }) => ({
    content: [{ type: "text" as const, text: JSON.stringify({ completed: true, task: await tasksRepo.completeAnalysisTask(input.task_id, input.result_analysis_id, input.completed_by) }, null, 2) }],
  }),
};
