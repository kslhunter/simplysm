import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const EXIT_INPUTS = new Set(["exit"]);

export function registerExit(pi: ExtensionAPI) {
  pi.registerCommand("exit", {
    description: "Exit pi when idle",
    handler: async (_args, ctx) => {
      shutdownWhenIdle(ctx);
    },
  });

  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") return { action: "continue" };
    if (!EXIT_INPUTS.has(event.text)) return { action: "continue" };

    shutdownWhenIdle(ctx);
    return { action: "handled" };
  });
}

function shutdownWhenIdle(ctx: ExtensionContext) {
  if (!ctx.isIdle()) {
    ctx.ui.notify(
      "/exit 또는 exit는 현재 작업이 없을 때만 종료합니다. 작업을 중단하려면 Escape로 abort한 뒤 다시 실행하세요.",
      "warning",
    );
    return;
  }

  ctx.shutdown();
}
