export async function runAgentWithGuardrails(goal: string) {
  const plan = planner(goal);
  const result = await executor(plan, memoryStore(), { timeoutMs: 5000, retry: 2 });
  traceAgentRun(goal, result);
  return result;
}

function planner(goal: string) {
  return { goal, tools: ["search", "edit"], approval: "required" };
}

async function executor(plan: { goal: string }, memory: string[], policy: { timeoutMs: number; retry: number }) {
  return { plan, memory, policy };
}

function memoryStore() {
  return ["prior decision"];
}

function traceAgentRun(goal: string, result: unknown) {
  return { goal, result, guardrail: true, evaluation: "passed" };
}
