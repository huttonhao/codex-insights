export type SessionOutcome =
  | "fully_achieved"
  | "mostly_achieved"
  | "partially_achieved"
  | "not_achieved"
  | "unclear_from_transcript";

export type AssistantHelpfulness =
  | "essential"
  | "very_helpful"
  | "moderately_helpful"
  | "slightly_helpful"
  | "unhelpful"
  | "unclear";

export type SessionType =
  | "quick_question"
  | "single_task"
  | "multi_task"
  | "iterative_refinement"
  | "exploration";

export interface SessionFacet {
  sessionId: string;
  underlyingGoal: string;
  goalCategories: Record<string, number>;
  outcome: SessionOutcome;
  userSatisfactionCounts: Record<
    | "frustrated"
    | "dissatisfied"
    | "neutral"
    | "likely_satisfied"
    | "satisfied"
    | "happy"
    | "no_explicit_feedback",
    number
  >;
  assistantHelpfulness: AssistantHelpfulness;
  sessionType: SessionType;
  frictionCounts: Record<
    | "wrong_approach"
    | "buggy_code"
    | "misunderstood_request"
    | "excessive_changes"
    | "incomplete_implementation"
    | "environment_issue"
    | "user_rejected_action",
    number
  >;
  frictionDetail: string;
  primarySuccess:
    | "multi_file_changes"
    | "correct_code_edits"
    | "good_debugging"
    | "good_explanations"
    | "test_generation"
    | "architecture_reasoning"
    | "none";
  briefSummary: string;
  sourceSessionIds: string[];
  confidence: "low" | "medium" | "high";
}

export function createEmptySessionFacet(sessionId: string): SessionFacet {
  return {
    sessionId,
    underlyingGoal: "unclear from structured metadata",
    goalCategories: {},
    outcome: "unclear_from_transcript",
    userSatisfactionCounts: {
      frustrated: 0,
      dissatisfied: 0,
      neutral: 0,
      likely_satisfied: 0,
      satisfied: 0,
      happy: 0,
      no_explicit_feedback: 1
    },
    assistantHelpfulness: "unclear",
    sessionType: "exploration",
    frictionCounts: {
      wrong_approach: 0,
      buggy_code: 0,
      misunderstood_request: 0,
      excessive_changes: 0,
      incomplete_implementation: 0,
      environment_issue: 0,
      user_rejected_action: 0
    },
    frictionDetail: "No LLM facet extraction was run for this session.",
    primarySuccess: "none",
    briefSummary: "Facet extraction was not run.",
    sourceSessionIds: [sessionId],
    confidence: "low"
  };
}
