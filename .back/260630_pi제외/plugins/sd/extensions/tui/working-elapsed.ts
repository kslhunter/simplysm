import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const UPDATE_INTERVAL_MS = 1000;

export function registerWorkingElapsed(pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let startedAt = 0;
  let latestContext: ExtensionContext | undefined;

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }

    latestContext?.ui.setWorkingMessage();
    latestContext = undefined;
    startedAt = 0;
  }

  function update(ctx: ExtensionContext) {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const elapsed = formatElapsed(elapsedSeconds);
    ctx.ui.setWorkingMessage(`작업 중... ${ctx.ui.theme.fg("muted", `(${elapsed})`)}`);
  }

  function start(ctx: ExtensionContext) {
    stop();
    latestContext = ctx;
    startedAt = Date.now();
    update(ctx);

    timer = setInterval(() => {
      if (!latestContext) return;
      update(latestContext);
    }, UPDATE_INTERVAL_MS);
    (timer as { unref?: () => void }).unref?.();
  }

  pi.on("agent_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    start(ctx);
  });
  pi.on("agent_end", () => stop());
  pi.on("session_shutdown", () => stop());
}

function formatElapsed(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
