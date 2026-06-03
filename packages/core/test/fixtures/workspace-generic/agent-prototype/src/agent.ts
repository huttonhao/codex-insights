export function runAgent(goal: string) {
  return planner(goal).toolCall("search");
}

function planner(goal: string) {
  return {
    toolCall(name: string) {
      return `${goal}:${name}`;
    }
  };
}
