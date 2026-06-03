export async function runAgentLoop(goal: string) {
  const plan = planner(goal);
  return executor(plan, memoryStore());
}

function planner(goal: string) {
  return { goal, tools: ["search", "edit"] };
}

function executor(plan: { goal: string }, memory: string[]) {
  return { plan, memory };
}

function memoryStore() {
  return ["prior decision"];
}
