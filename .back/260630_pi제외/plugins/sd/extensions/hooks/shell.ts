import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { checkShellCommand } from "../../shared/shell-guard.ts";

export function registerShellHook(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = getCommand(event.input);
    if (!command) return undefined;

    const violation = checkShellCommand(command);
    if (!violation) return undefined;

    if (ctx.hasUI) ctx.ui.notify(violation.reason, "warning");
    return { block: true, reason: violation.reason };
  });

  pi.on("user_bash", async (event, ctx) => {
    const violation = checkShellCommand(event.command);
    if (!violation) return undefined;

    if (ctx.hasUI) ctx.ui.notify(violation.reason, "warning");
    return {
      result: {
        output: violation.reason,
        exitCode: 1,
        cancelled: false,
        truncated: false,
      },
    };
  });
}

function getCommand(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;

  const command = (input as { command?: unknown }).command;
  return typeof command === "string" ? command : undefined;
}
