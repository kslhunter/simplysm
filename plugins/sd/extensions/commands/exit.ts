import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerExit(pi: ExtensionAPI) {
  pi.registerCommand("exit", {
    description: "다른 작업이 없을 때 pi 종료",
    handler: async (_args, ctx) => {
      if (!ctx.isIdle()) {
        ctx.ui.notify(
          "/exit는 현재 작업이 없을 때만 종료합니다. 작업을 중단하려면 Escape로 abort한 뒤 다시 실행하세요.",
          "warning",
        );
        return;
      }

      ctx.shutdown();
    },
  });
}
