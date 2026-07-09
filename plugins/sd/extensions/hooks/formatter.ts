import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  collectFormatterFiles,
  formatFailureMessage,
  resolveWorkspaceRoot,
  runFormatter,
} from "../../shared/formatter.ts";

const pendingFilesByWorkspaceRoot = new Map<string, Set<string>>();

export function registerFormatterHook(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
    if (event.isError) return undefined;

    const inputPath = getInputPath(event.input);
    if (!inputPath) return undefined;

    try {
      const workspaceRoot = resolveWorkspaceRoot({ cwd: ctx.cwd });

      const targetFiles = await collectFormatterFiles(workspaceRoot, [inputPath], {
        cwd: ctx.cwd,
      });
      if (targetFiles.length === 0) return undefined;

      const pendingFiles = getPendingFiles(workspaceRoot);
      for (const filePath of targetFiles) {
        pendingFiles.add(filePath);
      }
    } catch (error) {
      reportFormatterHookError(pi, ctx, "자동 포맷 대상 수집 실패", error);
    }

    return undefined;
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (pendingFilesByWorkspaceRoot.size === 0) return undefined;

    for (const [workspaceRoot, pendingFiles] of pendingFilesByWorkspaceRoot) {
      try {
        const targetFiles = await collectFormatterFiles(workspaceRoot, [...pendingFiles], {
          cwd: workspaceRoot,
        });

        if (targetFiles.length === 0) {
          pendingFilesByWorkspaceRoot.delete(workspaceRoot);
          continue;
        }

        const result = await runFormatter(workspaceRoot, targetFiles, { signal: ctx.signal });
        if (result.success) {
          pendingFilesByWorkspaceRoot.delete(workspaceRoot);
          continue;
        }

        pendingFilesByWorkspaceRoot.set(workspaceRoot, new Set(result.files));
        const message = formatFailureMessage(result);
        if (ctx.hasUI) ctx.ui.notify("자동 포맷 실패", "error");
        pi.sendUserMessage(`${message}\n\n위 실패 원인을 수정한 뒤 다시 완료하세요.`, {
          deliverAs: "followUp",
        });
      } catch (error) {
        reportFormatterHookError(pi, ctx, "자동 포맷 실행 실패", error);
      }
    }

    return undefined;
  });
}

function getPendingFiles(workspaceRoot: string): Set<string> {
  const pendingFiles = pendingFilesByWorkspaceRoot.get(workspaceRoot);
  if (pendingFiles) return pendingFiles;

  const nextPendingFiles = new Set<string>();
  pendingFilesByWorkspaceRoot.set(workspaceRoot, nextPendingFiles);
  return nextPendingFiles;
}

function getInputPath(input: unknown): string | undefined {
  const inputPath = asRecord(input)?.["path"];
  return typeof inputPath === "string" ? inputPath : undefined;
}

function reportFormatterHookError(
  pi: ExtensionAPI,
  ctx: {
    hasUI: boolean;
    ui: { notify(message: string, level: "info" | "warning" | "error"): void };
  },
  title: string,
  error: unknown,
): void {
  const message = `${title}: ${formatErrorMessage(error)}`;
  if (ctx.hasUI) ctx.ui.notify(message, "error");
  pi.sendUserMessage(message, { deliverAs: "followUp" });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
