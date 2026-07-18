import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { asRecord, formatErrorMessage, readStdinJson } from "../shared/hook-io.ts";

const MARKER_START = "<!-- main-only:start -->";
const MARKER_END = "<!-- main-only:end -->";

const SUBAGENT_PREAMBLE = [
  "아래는 이 워크스페이스의 최우선 행동지침입니다. 모든 판단, 조사, 출력에 그대로 적용하세요.",
  "당신은 서브에이전트라 사용자와 직접 대화할 통로가 없습니다.",
  "`논의`나 승인이 필요한 지점을 만나면 멈추지 말고, 그 지점과 선택지를 호출자에게 보고하세요.",
].join("\n");

async function main(): Promise<void> {
  const data = await readStdinJson();
  if (!isTargetAgent(data)) return;

  const stylePath = join(resolvePluginRoot(data), "output-styles", "sd.md");

  let context: string;
  try {
    const raw = await readFile(stylePath, "utf8");
    context = [SUBAGENT_PREAMBLE, stripMainOnly(stripFrontmatter(raw))].join("\n\n");
  } catch (error) {
    // SubagentStart 는 spawn 을 막을 수 없어 여기서 throw 해도 서브에이전트는 그대로 실행됩니다.
    // 지침 공백을 만들지 않도록 원문을 그대로 싣고, 실패 사실을 보고에 드러내도록 지시합니다.
    context = await buildFallbackContext(stylePath, error);
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SubagentStart",
        additionalContext: context,
      },
    }),
  );
}

function isTargetAgent(data: unknown): boolean {
  const agentType = asRecord(data)?.["agent_type"];
  if (typeof agentType !== "string") return false;
  return agentType === "general-purpose" || agentType.startsWith("sd:");
}

/** output style 메타데이터(name·force-for-plugin 등)는 지침이 아니므로 걷어냅니다. */
function stripFrontmatter(source: string): string {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---[^\n]*\r?\n/, "");
}

/**
 * `<!-- main-only:start -->` ~ `<!-- main-only:end -->` 구간을 제거합니다.
 * 해당 구간은 메인 대화 전용 규칙(`논의`, 작업수행 게이트)이라 서브에이전트에 주면 멈춤을 유발합니다.
 * 마커 짝이 맞지 않으면 잘라낸 범위를 신뢰할 수 없으므로 throw 해 fallback 으로 넘깁니다.
 */
function stripMainOnly(source: string): string {
  const segments: string[] = [];
  let cursor = 0;

  while (true) {
    const start = source.indexOf(MARKER_START, cursor);
    if (start === -1) break;

    const end = source.indexOf(MARKER_END, start);
    if (end === -1) {
      throw new Error(`${MARKER_START} 에 대응하는 ${MARKER_END} 가 없습니다.`);
    }

    segments.push(source.slice(cursor, start));
    cursor = end + MARKER_END.length;
  }

  if (source.indexOf(MARKER_END, cursor) !== -1) {
    throw new Error(`${MARKER_START} 없이 ${MARKER_END} 가 나타납니다.`);
  }

  segments.push(source.slice(cursor));
  return segments
    .join("")
    .replace(/(\r?\n){3,}/g, "\n\n")
    .trim();
}

async function buildFallbackContext(stylePath: string, error: unknown): Promise<string> {
  const notice = [
    `IMPORTANT: 행동지침(${stylePath}) 로드에 실패했습니다 — ${formatErrorMessage(error)}`,
    "최종 보고 첫 줄에 이 실패 사실을 그대로 포함해 호출자가 인지하게 하세요.",
  ].join("\n");

  try {
    const raw = await readFile(stylePath, "utf8");
    return [notice, SUBAGENT_PREAMBLE, raw.trim()].join("\n\n");
  } catch {
    return notice;
  }
}

function resolvePluginRoot(data: unknown): string {
  const envPluginRoot = process.env["CLAUDE_PLUGIN_ROOT"];
  if (envPluginRoot) return envPluginRoot;

  const inputPluginRoot = asRecord(data)?.["plugin_root"] ?? asRecord(data)?.["pluginRoot"];
  if (typeof inputPluginRoot === "string" && inputPluginRoot) return inputPluginRoot;

  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

await main();
