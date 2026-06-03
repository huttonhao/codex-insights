export const agentMessages = {
  "agent.finding.method": "Agent 不是只看 agent 关键词，本报告按 planner、tool registry、memory、state machine、human approval、eval、tracing 和 failure recovery 判断成熟度。",
  "agent.finding.coverage": "{count}/{total} 个项目有 Agent 证据；缺 eval/tracing/recovery 的项目不能视为可平台化 Agent runtime。",
  "agent.architecture.rationale.planner": "planner 和 tool registry 应平台化，避免每个项目重复定义工具协议。",
  "agent.architecture.rationale.boundary": "memory、approval 和 sandbox 是生产边界，不能只靠 demo 逻辑。",
  "agent.architecture.rationale.ops": "eval/tracing/recovery 决定 Agent 是否能持续迭代。"
} as const;
