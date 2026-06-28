import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BLOCK_REASON =
  "git 변경 명령은 기본 차단됩니다. 조회(status/diff/log/show/check-ignore, tag -l/--list)는 허용됩니다. 커밋 작업은 전용 skill을 사용하세요.";
const GIT_ALLOW_TOKEN = "sd-git-allow";
const COMMAND_POSITION_PATTERN = "(^|[;&|=({])\\s*";
const GIT_EXECUTABLE_PATTERN = "git(?:\\.exe)?";
const GIT_DIR_PATTERN = "(?:\"[^\"$`]*\"|'[^']*'|[^\\s\"'$`;&|<>()]+)";
const GIT_COMMAND_PATTERN = new RegExp(
  `${COMMAND_POSITION_PATTERN}${GIT_EXECUTABLE_PATTERN}(?=\\s|$)`,
  "gi",
);
const GIT_READONLY_COMMAND_PATTERN = new RegExp(
  `${COMMAND_POSITION_PATTERN}${GIT_EXECUTABLE_PATTERN}\\s+` +
    `(?:(?:--no-pager|-C\\s+${GIT_DIR_PATTERN})\\s+)*` +
    `(?:status|diff|log|show|check-ignore|tag\\s+(?:-l|--list))\\b`,
  "gi",
);

export function registerGitGuard(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = getCommand(event.input);
    if (!command || !isBlockedGitCommand(command)) return undefined;

    if (ctx.hasUI) ctx.ui.notify(BLOCK_REASON, "warning");
    return { block: true, reason: BLOCK_REASON };
  });

  pi.on("user_bash", async (event, ctx) => {
    if (!isBlockedGitCommand(event.command)) return undefined;

    if (ctx.hasUI) ctx.ui.notify(BLOCK_REASON, "warning");
    return {
      result: {
        output: BLOCK_REASON,
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

function isBlockedGitCommand(command: string): boolean {
  if (command.includes(GIT_ALLOW_TOKEN)) return false;

  const gitCommandStarts = findMatchStarts(GIT_COMMAND_PATTERN, command);
  if (gitCommandStarts.length === 0) return false;

  const readonlyGitCommandStarts = new Set(findMatchStarts(GIT_READONLY_COMMAND_PATTERN, command));
  return gitCommandStarts.some((start) => !readonlyGitCommandStarts.has(start));
}

function findMatchStarts(regExp: RegExp, text: string): number[] {
  regExp.lastIndex = 0;
  const starts: number[] = [];

  while (true) {
    const match = regExp.exec(text);
    if (!match) return starts;

    starts.push(match.index);
  }
}
