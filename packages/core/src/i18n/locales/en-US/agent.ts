export const agentMessages = {
  "agent.finding.method": "Agent maturity is evaluated across planner, tool registry, memory, state machine, human approval, eval, tracing, and failure recovery.",
  "agent.finding.coverage": "{count}/{total} projects contain Agent evidence; projects without eval/tracing/recovery should not be treated as platform-ready runtimes.",
  "agent.architecture.rationale.planner": "Planner and tool registry should be shared to avoid duplicated tool contracts.",
  "agent.architecture.rationale.boundary": "Memory, approval, and sandboxing define production boundaries beyond demos.",
  "agent.architecture.rationale.ops": "Eval, tracing, and recovery determine whether the agent can improve safely."
} as const;
