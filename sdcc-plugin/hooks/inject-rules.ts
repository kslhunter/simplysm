// SessionStart·SubagentStart 훅: rules.md 본문을 컨텍스트에 주입한다.
// SessionStart 는 서브에이전트에 닿지 않으므로 두 이벤트에 같은 스크립트를 건다.

import path from "node:path";

const input = (await Bun.stdin.json()) as { hook_event_name: string };
const body = (await Bun.file(path.join(import.meta.dir, "..", "rules.md")).text()).trim();

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: body,
    },
  }),
);
