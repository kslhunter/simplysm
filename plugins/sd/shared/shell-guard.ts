export interface ShellGuardViolation {
  label: string;
  reason: string;
}

const GIT_BLOCK_LABEL =
  "git (forbidden by default; read-only status/diff/log/show/ls-files/check-ignore and tag -l/--list are allowed; use the commit skill for commits).";
const GIT_BLOCK_REASON =
  "git 변경 명령은 기본 차단됩니다. 조회(status/diff/log/show/ls-files/check-ignore, tag -l/--list)는 허용됩니다. 커밋 작업은 전용 skill을 사용하세요.";
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
    `(?:status|diff|log|show|ls-files|check-ignore|tag\\s+(?:-l|--list))\\b`,
  "gi",
);

const BLOCKED_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  {
    pattern: new RegExp(`${COMMAND_POSITION_PATTERN}cd\\s+`, "i"),
    label: "cd (directory change not allowed)",
  },
  {
    pattern: new RegExp(`${COMMAND_POSITION_PATTERN}npx\\s+tsc\\b`, "i"),
    label: "npx tsc (use the typecheck script in package.json)",
  },
  {
    pattern: new RegExp(`${COMMAND_POSITION_PATTERN}npx\\s+eslint\\b`, "i"),
    label: "npx eslint (use the lint script in package.json)",
  },
  {
    pattern: new RegExp(
      `${COMMAND_POSITION_PATTERN}(npx\\s+)?playwright-cli\\s+(?:-s=\\S+\\s+)?(screenshot|pdf|snapshot)\\b[^|;&\\n]*[ \\t]--filename\\b`,
      "i",
    ),
    label:
      "playwright-cli {screenshot|pdf|snapshot} --filename (omit to auto-save under .playwright-cli/)",
  },
  {
    pattern: new RegExp(
      `${COMMAND_POSITION_PATTERN}(npx\\s+)?playwright-cli\\s+(?:-s=\\S+\\s+)?(state-save|video-start)[ \\t]+\\S`,
      "i",
    ),
    label:
      "playwright-cli {state-save|video-start} <path> (omit path to auto-save under .playwright-cli/)",
  },
];

export function checkShellCommand(commandText: string): ShellGuardViolation | undefined {
  for (const { pattern, label } of BLOCKED_PATTERNS) {
    if (pattern.test(commandText)) return { label, reason: label };
  }

  if (isBlockedGitCommand(commandText)) {
    return { label: GIT_BLOCK_LABEL, reason: GIT_BLOCK_REASON };
  }

  return undefined;
}

function isBlockedGitCommand(commandText: string): boolean {
  if (commandText.includes(GIT_ALLOW_TOKEN)) return false;

  const gitCommandStarts = findMatchStarts(GIT_COMMAND_PATTERN, commandText);
  if (gitCommandStarts.length === 0) return false;

  const readonlyGitCommandStarts = new Set(
    findMatchStarts(GIT_READONLY_COMMAND_PATTERN, commandText),
  );
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
