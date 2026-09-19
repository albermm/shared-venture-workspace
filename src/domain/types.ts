export type ProjectStatus = "active" | "paused" | "archived";

export type IdeaStatus = "draft" | "active" | "parked" | "rejected";

export type HypothesisType =
  | "problem"
  | "customer"
  | "value_prop"
  | "willingness_to_pay"
  | "technical"
  | "distribution"
  | "unit_economics"
  | "other";

export type HypothesisStatus = "open" | "supported" | "contradicted" | "retired";

export type Confidence = "unknown" | "weak" | "medium" | "strong";

export type EvidenceType =
  | "interview"
  | "email"
  | "experiment_result"
  | "market_data"
  | "competitor"
  | "technical_test"
  | "external_source"
  | "other";

export type EvidenceRelationship = "supports" | "contradicts" | "neutral";

export type ExperimentStatus =
  | "proposed"
  | "approved"
  | "running"
  | "completed"
  | "cancelled";

export type AnalysisRefType = "evidence" | "hypothesis" | "analysis";
export type AnalysisTaskStatus = "pending" | "claimed" | "completed" | "cancelled";

export interface Project {
  id: string;
  human_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  project_id: string;
  human_id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  status: IdeaStatus;
  parent_idea_id: string | null;
  created_by: string;
  created_at: string;
  tags: string[];
}

export interface Hypothesis {
  id: string;
  project_id: string;
  human_id: string;
  statement: string;
  type: HypothesisType;
  status: HypothesisStatus;
  confidence: Confidence;
  rationale: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  project_id: string;
  human_id: string;
  evidence_type: EvidenceType;
  title: string;
  content: string;
  source: string | null;
  source_url: string | null;
  collected_at: string | null;
  created_by: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface EvidenceHypothesisLink {
  evidence_id: string;
  hypothesis_id: string;
  relationship: EvidenceRelationship;
  created_by: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  project_id: string;
  human_id: string;
  author: string;
  summary: string;
  full_text: string;
  confidence: Confidence;
  assumptions: string[];
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface AnalysisReference {
  analysis_id: string;
  ref_type: AnalysisRefType;
  ref_id: string;
}

export interface AnalysisTask {
  id: string;
  project_id: string;
  idea_id: string;
  requested_by: string;
  assigned_to: string | null;
  prompt: string;
  status: AnalysisTaskStatus;
  result_analysis_id: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Experiment {
  id: string;
  project_id: string;
  human_id: string;
  objective: string;
  methodology: string | null;
  status: ExperimentStatus;
  owner: string | null;
  success_criteria: string | null;
  results_summary: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  altered_by: string | null;
  created_at: string;
  updated_at: string;
}
