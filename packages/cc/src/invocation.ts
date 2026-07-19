import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "@simplysm/core-common";

/**
 * 번들된 플러그인·시스템 프롬프트의 위치.
 *
 * 빌드 산출(dist/cc.js)·소스(src/cc.ts) 어느 쪽으로 실행되든 패키지 루트를 구한 뒤
 * dist/plugins 를 가리킨다. 플러그인 복사본은 빌드 시에만 dist 로 복사되므로
 * 소스 실행 시에도 dist 기준이다.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const bundledPluginsDir = toPosix(path.join(pkgRoot, "dist", "plugins"));

const SD_PLUGIN_DIR = `${bundledPluginsDir}/sd`;
const SD_WIKI_PLUGIN_DIR = `${bundledPluginsDir}/sd-wiki`;
const SYSTEM_PROMPT_FILE = `${SD_PLUGIN_DIR}/output-styles/sd.md`;

function toPosix(target: string): string {
  return target.replace(/\\/g, "/");
}

/**
 * 명령 프로세서에 넘길 인자를 인용한다.
 *
 * 인자를 그대로 넘기면 JSON 인자의 따옴표가 소실되므로 직접 인용한다.
 */
function quoteArg(arg: string): string {
  // 닫는 따옴표 앞의 역슬래시는 두 배로 늘려야 리터럴로 남는다.
  const escaped = arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1");
  return `"${escaped}"`;
}

export interface CommandProcessorSpawn {
  command: string;
  args: string[];
  options: { windowsVerbatimArguments: true; shell?: undefined };
}

/**
 * Windows 명령 프로세서로 명령을 실행하기 위한 spawn 인자를 구성한다.
 *
 * claude 는 .cmd 셰이퍼라 명령 프로세서를 경유해야 실행된다. Node 의 셸 옵션을 쓰면
 * 인자가 이스케이프 없이 이어붙여져 JSON 인자가 깨지고 경고도 발생하므로,
 * 명령줄을 직접 인용해 구성하고 Node 의 재인용을 끈다.
 */
export function buildCommandProcessorSpawn(command: string, args: string[]): CommandProcessorSpawn {
  const commandLine = [command, ...args].map(quoteArg).join(" ");
  return {
    command: env("ComSpec") ?? "cmd.exe",
    // /s 는 명령줄의 바깥 따옴표 한 겹을 벗기므로, 벗겨질 몫을 한 겹 더 씌운다.
    args: ["/d", "/s", "/c", `"${commandLine}"`],
    options: { windowsVerbatimArguments: true },
  };
}

export interface ClaudeInvocation {
  /** claude 에 전달할 인자 */
  args: string[];
  /** claude 실행 시 추가로 설정할 환경 변수 */
  env: Record<string, string>;
}

/**
 * claude 실행에 사용할 인자와 환경 변수를 구성한다.
 *
 * @param userArgs 사용자가 cc 에 넘긴 인자 (고정 인자 뒤에 그대로 붙는다)
 */
export function buildClaudeInvocation(userArgs: string[]): ClaudeInvocation {
  return {
    env: {
      CLAUDE_CODE_DISABLE_AGENT_VIEW: "1",
      CLAUDE_CODE_USE_POWERSHELL_TOOL: "1",
      CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: "1",
      DISABLE_TELEMETRY: "1",
      DISABLE_ERROR_REPORTING: "1",
      DISABLE_BUG_COMMAND: "1",
      CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
      CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
      DISABLE_NON_ESSENTIAL_MODEL_CALLS: "1",
      CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION: "0",
      CLAUDE_CODE_ENABLE_AWAY_SUMMARY: "0",
      DISABLE_AUTO_COMPACT: "1",
      CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
      CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: "1",
      CLAUDE_CODE_ACCESSIBILITY: "1",
      CLAUDE_CODE_DISABLE_CRON: "1",
      CLAUDE_CODE_DISABLE_ARTIFACT: "1",
      CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
      CLAUDE_CODE_DISABLE_ATTACHMENTS: "1",
      CLAUDE_CODE_NO_FLICKER: "1",
      CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT: "1",
    },
    args: [
      "--dangerously-skip-permissions",
      "--tools",
      "Agent,PowerShell,Grep,Glob,Read,Write,Edit,Skill,WebSearch,WebFetch",
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--plugin-dir",
      SD_PLUGIN_DIR,
      "--plugin-dir",
      SD_WIKI_PLUGIN_DIR,
      "--system-prompt-file",
      SYSTEM_PROMPT_FILE,
      "--settings",
      '{"spinnerTipsEnabled":false,"terminalProgressBarEnabled":false}',
      ...userArgs,
    ],
  };
}
