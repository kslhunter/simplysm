import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import {
  defineTool,
  getMarkdownTheme,
  keyHint,
  type AgentToolResult,
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
  type ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { CODEX_FAST_MODE_ENV, isCodexFastModeEnabled } from "../codex/fast-mode.ts";

const PROGRESS_EMIT_INTERVAL_MS = 1000;
const FORCE_KILL_DELAY_MS = 5000;
const PREVIEW_LINE_COUNT = 3;
const PREVIEW_LINE_MAX_CHARS = 500;
const SUBAGENT_APPEND_SYSTEM_PROMPT = [
  "너는 부모 Pi 세션에서 도구로 호출된 격리 서브에이전트다.",
  "결과는 부모 에이전트가 이어서 판단할 근거로 명확히 반환하라.",
].join("\n");
const SubagentParams = Type.Object({
  task: Type.String({ description: "격리된 자식 pi 프로세스에서 실행할 작업 프롬프트" }),
  title: Type.Optional(Type.String({ description: "상태 줄에 표시할 서브에이전트 작업 제목" })),
  allowSubagent: Type.Optional(
    Type.Boolean({
      description:
        "자식 pi 프로세스에서 subagent/parallel_subagent 도구 사용을 허용할지 여부. 기본값은 false",
    }),
  ),
  allowSkills: Type.Optional(
    Type.Boolean({
      description: "자식 pi 프로세스에서 스킬 탐색과 로딩을 허용할지 여부. 기본값은 false",
    }),
  ),
});
const ParallelSubagentParams = Type.Object({
  agents: Type.Array(SubagentParams, {
    description: "병렬로 실행할 서브에이전트 목록",
    minItems: 1,
  }),
});

type ToolStatus = "running" | "done" | "error";
type TextDisplayItem = { type: "text"; text: string };
type ToolDisplayItem = {
  type: "tool";
  name: string;
  args: Record<string, unknown>;
  status: ToolStatus;
};

type SubagentDisplayItem = TextDisplayItem | ToolDisplayItem;
type PreviewLine = { type: "text"; text: string } | { type: "tool"; item: ToolDisplayItem };

interface SubagentUsageStats {
  input: number;
  output: number;
}

interface SubagentRunResult {
  exitCode: number;
  output: string;
  stderr: string;
  aborted: boolean;
  task: string;
  displayItems: SubagentDisplayItem[];
  usage: SubagentUsageStats;
  title?: string;
  stopReason?: string;
  errorMessage?: string;
}

interface ParallelSubagentInput {
  task: string;
  title?: string;
  allowSubagent?: boolean;
  allowSkills?: boolean;
}

interface ParallelSubagentChildResult extends ParallelSubagentInput {
  index: number;
  status: ToolStatus;
  result?: SubagentRunResult;
  errorMessage?: string;
}

interface ParallelSubagentRunResult {
  children: ParallelSubagentChildResult[];
  usage: SubagentUsageStats;
  aborted: boolean;
  failed: boolean;
}

interface AssistantResult {
  text?: string;
  stopReason?: string;
  errorMessage?: string;
}

interface RunSubagentOptions {
  title?: string;
  allowSubagent?: boolean;
  allowSkills?: boolean;
  model?: ExtensionContext["model"];
  thinkingLevel?: ReturnType<ExtensionAPI["getThinkingLevel"]>;
  fastMode?: boolean;
  onProgress?: (result: SubagentRunResult) => void;
}

interface RunParallelSubagentsOptions extends Pick<
  RunSubagentOptions,
  "model" | "thinkingLevel" | "fastMode"
> {
  onProgress?: (result: ParallelSubagentRunResult) => void;
}

interface RunState {
  output: string;
  stopReason?: string;
  errorMessage?: string;
  displayItems: SubagentDisplayItem[];
  toolItemsById: Map<string, ToolDisplayItem>;
  usage: SubagentUsageStats;
  currentTextItem?: TextDisplayItem;
}

interface SubagentViewState {
  running: boolean;
  icon: string;
  status: string;
  title: string;
  meta: string;
}

interface ThemeLike {
  fg: Theme["fg"];
}

const PLAIN_THEME: ThemeLike = { fg: (_color, text) => text };
const SUBAGENT_ENV_PASSTHROUGH = new Set([
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "SHELL",
  "TERM",
  "LANG",
]);

export function registerSubagent(pi: ExtensionAPI) {
  pi.registerTool(
    defineTool<typeof SubagentParams, SubagentRunResult>({
      name: "subagent",
      label: "서브에이전트",
      description: "위임한 프롬프트를 격리된 자식 pi 프로세스에서 실행합니다.",
      promptSnippet: "격리된 자식 pi 프로세스에서 위임된 프롬프트를 실행합니다.",
      promptGuidelines: [
        "독립 조사, 리뷰, 작업 분해처럼 격리된 컨텍스트가 도움이 되는 경우 subagent를 사용하세요.",
        "단순 파일 읽기나 직접 편집처럼 메인 에이전트가 더 직접 수행할 수 있는 작업에는 subagent를 사용하지 마세요.",
      ],
      parameters: SubagentParams,

      renderCall() {
        return new Container();
      },

      async execute(_toolCallId, params, signal, onUpdate, ctx) {
        const result = await runSubagent(params.task, ctx.cwd, signal, {
          title: params.title,
          allowSubagent: params.allowSubagent,
          allowSkills: params.allowSkills,
          model: ctx.model,
          thinkingLevel: getCurrentThinkingLevel(pi),
          fastMode: isCodexFastModeEnabled(),
          onProgress: (partial) => {
            onUpdate?.({
              content: [{ type: "text" as const, text: formatProgressContent(partial) }],
              details: partial,
            });
          },
        });

        return buildToolResult(result, formatToolContent(result));
      },

      renderResult(result, options, theme) {
        return renderSubagentResult(result, options, theme);
      },
    }),
  );

  pi.registerTool(
    defineTool<typeof ParallelSubagentParams, ParallelSubagentRunResult>({
      name: "parallel_subagent",
      label: "병렬 서브에이전트",
      description: "여러 위임 프롬프트를 격리된 자식 pi 프로세스들에서 병렬 실행합니다.",
      promptSnippet: "여러 격리된 자식 pi 프로세스를 병렬 실행합니다.",
      promptGuidelines: [
        "독립적인 조사, 리뷰, 작업 분해 여러 개를 동시에 위임할 때 parallel_subagent를 사용하세요.",
        "순차 의존성이 있는 작업에는 parallel_subagent를 사용하지 말고 필요한 순서대로 subagent를 사용하세요.",
      ],
      parameters: ParallelSubagentParams,

      renderCall() {
        return new Container();
      },

      async execute(_toolCallId, params, signal, onUpdate, ctx) {
        if (params.agents.length === 0) {
          throw new Error("parallel_subagent에는 최소 1개의 agent가 필요합니다.");
        }

        const result = await runParallelSubagents(params.agents, ctx.cwd, signal, {
          model: ctx.model,
          thinkingLevel: getCurrentThinkingLevel(pi),
          fastMode: isCodexFastModeEnabled(),
          onProgress: (partial) => {
            onUpdate?.({
              content: [{ type: "text" as const, text: formatParallelProgressContent(partial) }],
              details: partial,
            });
          },
        });

        return buildParallelToolResult(result, formatParallelToolContent(result));
      },

      renderResult(result, options, theme) {
        return renderParallelSubagentResult(result, options, theme);
      },
    }),
  );
}

function buildToolResult(
  result: SubagentRunResult,
  output: string,
): AgentToolResult<SubagentRunResult> {
  if (result.aborted || result.stopReason === "aborted") {
    throw new Error(`서브에이전트가 중단되었습니다.\n\n${output}`);
  }

  if (result.stopReason === "error") {
    throw new Error(`서브에이전트가 오류 상태로 종료되었습니다.\n\n${output}`);
  }

  if (result.exitCode !== 0) {
    throw new Error(`서브에이전트가 exit code ${result.exitCode}로 실패했습니다.\n\n${output}`);
  }

  return {
    content: [{ type: "text" as const, text: output }],
    details: result,
  };
}

function buildParallelToolResult(
  result: ParallelSubagentRunResult,
  output: string,
): AgentToolResult<ParallelSubagentRunResult> {
  if (result.aborted) {
    throw new Error(`병렬 서브에이전트가 중단되었습니다.\n\n${output}`);
  }

  if (result.failed) {
    throw new Error(`병렬 서브에이전트 중 일부가 실패했습니다.\n\n${output}`);
  }

  return {
    content: [{ type: "text" as const, text: output }],
    details: result,
  };
}

function getCurrentThinkingLevel(
  pi: ExtensionAPI,
): ReturnType<ExtensionAPI["getThinkingLevel"]> | undefined {
  try {
    return pi.getThinkingLevel();
  } catch {
    return undefined;
  }
}

function appendCurrentSessionArgs(args: string[], options: RunSubagentOptions) {
  if (options.model) {
    args.push("--provider", options.model.provider, "--model", options.model.id);
  }

  if (options.thinkingLevel) args.push("--thinking", options.thinkingLevel);
}

function buildSubagentEnv(fastMode: boolean): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};

  for (const [envName, value] of Object.entries(process.env)) {
    if (value === undefined || !shouldPassSubagentEnv(envName)) continue;
    env[envName] = value;
  }

  env[CODEX_FAST_MODE_ENV] = fastMode ? "1" : "0";
  return env;
}

function shouldPassSubagentEnv(envName: string): boolean {
  const normalized = envName.toUpperCase();
  return SUBAGENT_ENV_PASSTHROUGH.has(normalized) || normalized.startsWith("LC_");
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
  if (currentScript && !isBunVirtualScript && existsSync(currentScript)) {
    return { command: process.execPath, args: [currentScript, ...args] };
  }

  const execName = basename(process.execPath).toLowerCase();
  const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
  if (!isGenericRuntime) return { command: process.execPath, args };

  return { command: "pi", args };
}

async function runSubagent(
  task: string,
  cwd: string,
  signal?: AbortSignal,
  options: RunSubagentOptions = {},
): Promise<SubagentRunResult> {
  const args = ["--mode", "json", "-p", "--no-session"];
  appendCurrentSessionArgs(args, options);
  args.push("--append-system-prompt", SUBAGENT_APPEND_SYSTEM_PROMPT);

  const excludedTools: string[] = [];
  if (!options.allowSubagent) excludedTools.push("subagent", "parallel_subagent");
  if (!options.allowSkills) {
    args.push("--no-skills");
    excludedTools.push("skill");
  }
  if (excludedTools.length > 0) args.push("--exclude-tools", excludedTools.join(","));

  const state: RunState = {
    output: "",
    displayItems: [],
    toolItemsById: new Map(),
    usage: { input: 0, output: 0 },
  };

  let stderr = "";
  let buffer = "";
  let aborted = false;
  let lastProgressEmit = 0;

  const snapshot = (exitCode: number): SubagentRunResult => ({
    exitCode,
    output: state.output,
    stderr,
    aborted,
    task,
    title: options.title,
    displayItems: cloneDisplayItems(state.displayItems),
    usage: { ...state.usage },
    stopReason: state.stopReason,
    errorMessage: state.errorMessage,
  });

  const emitProgress = (force = false) => {
    if (!options.onProgress) return;
    const now = Date.now();
    if (!force && now - lastProgressEmit < PROGRESS_EMIT_INTERVAL_MS) return;
    lastProgressEmit = now;
    options.onProgress(snapshot(-1));
  };

  const exitCode = await new Promise<number>((resolve) => {
    // subagent는 자식 pi의 JSON 이벤트 스트림을 실시간으로 읽어 진행 상황을 표시해야 하므로 pi.exec() 대신 spawn을 사용합니다.
    // pi.exec()는 완료 후 stdout/stderr를 한 번에 받는 형태라 message/tool 이벤트 단위 업데이트에 맞지 않습니다.
    const invocation = getPiInvocation(args);
    const proc = spawn(invocation.command, invocation.args, {
      cwd,
      env: buildSubagentEnv(options.fastMode === true),
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Pi 0.80.2 CLI는 `--` 옵션 종료자를 지원하지 않고, 프롬프트가 `-`로 시작하면
    // argv 메시지가 옵션으로 오인될 수 있으므로 작업 프롬프트는 stdin으로 전달합니다.
    proc.stdin?.on("error", () => {
      // 자식 프로세스가 CLI 파싱 오류 등으로 먼저 종료되면 EPIPE가 발생할 수 있습니다.
    });
    proc.stdin?.end(task);

    let settled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (forceKillTimer) clearTimeout(forceKillTimer);
      signal?.removeEventListener("abort", killProc);
    };

    const settle = (code: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(code);
    };

    function killProc() {
      if (aborted) return;
      aborted = true;
      terminateProcessTree(proc, "SIGTERM");
      forceKillTimer = setTimeout(() => terminateProcessTree(proc, "SIGKILL"), FORCE_KILL_DELAY_MS);
      (forceKillTimer as { unref?: () => void }).unref?.();
      emitProgress(true);
    }

    const processLine = (line: string) => {
      const agentEvent = parseJsonObject(line);
      if (!agentEvent) return;

      processSubagentEvent(agentEvent, state);
      emitProgress(isMilestoneEvent(agentEvent));
    };

    proc.stdout.on("data", (data: Buffer) => {
      buffer += data.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) processLine(line);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf8");
      emitProgress();
    });

    proc.on("close", (code, signal) => {
      if (buffer.trim()) processLine(buffer);
      emitProgress(true);
      settle(code ?? (signal ? 1 : 0));
    });

    proc.on("error", (error) => {
      stderr += error.message;
      state.errorMessage = error.message;
      emitProgress(true);
      settle(1);
    });

    if (signal?.aborted) killProc();
    else signal?.addEventListener("abort", killProc, { once: true });
  });

  return snapshot(exitCode);
}

async function runParallelSubagents(
  agents: ParallelSubagentInput[],
  cwd: string,
  signal?: AbortSignal,
  options: RunParallelSubagentsOptions = {},
): Promise<ParallelSubagentRunResult> {
  const children: ParallelSubagentChildResult[] = agents.map((agent, index) => ({
    ...agent,
    index: index + 1,
    status: "running",
  }));

  const snapshot = (): ParallelSubagentRunResult => ({
    children: cloneParallelChildren(children),
    usage: sumParallelUsage(children),
    aborted: hasParallelAbort(children),
    failed: hasParallelFailure(children),
  });

  const emitProgress = () => options.onProgress?.(snapshot());
  emitProgress();

  await Promise.all(
    agents.map(async (agent, index) => {
      try {
        const result = await runSubagent(agent.task, cwd, signal, {
          title: agent.title,
          allowSubagent: agent.allowSubagent,
          allowSkills: agent.allowSkills,
          model: options.model,
          thinkingLevel: options.thinkingLevel,
          fastMode: options.fastMode,
          onProgress: (partial) => {
            children[index] = {
              ...children[index],
              status: "running",
              result: partial,
              errorMessage: partial.errorMessage,
            };
            emitProgress();
          },
        });

        children[index] = {
          ...children[index],
          status: isFailedRun(result) ? "error" : "done",
          result,
          errorMessage: result.errorMessage,
        };
      } catch (error) {
        children[index] = {
          ...children[index],
          status: "error",
          errorMessage: errorToMessage(error),
        };
      }

      emitProgress();
    }),
  );

  return snapshot();
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function terminateProcessTree(proc: ChildProcess, signal: NodeJS.Signals) {
  if (!proc.pid) {
    proc.kill(signal);
    return;
  }

  if (process.platform === "win32") {
    const args = ["/PID", String(proc.pid), "/T"];
    if (signal === "SIGKILL") args.push("/F");

    const killer = spawn("taskkill", args, {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", () => proc.kill(signal));
    return;
  }

  try {
    process.kill(-proc.pid, signal);
  } catch {
    proc.kill(signal);
  }
}

function isMilestoneEvent(agentEvent: Record<string, unknown>): boolean {
  return (
    agentEvent.type === "tool_execution_start" ||
    agentEvent.type === "tool_execution_end" ||
    agentEvent.type === "message_end" ||
    agentEvent.type === "agent_end"
  );
}

function processSubagentEvent(agentEvent: Record<string, unknown>, state: RunState) {
  switch (agentEvent.type) {
    case "message_start":
      handleMessageStart(agentEvent.message, state);
      return;
    case "message_update":
      handleMessageUpdate(agentEvent, state);
      return;
    case "message_end":
      handleMessageEnd(agentEvent.message, state);
      return;
    case "agent_end":
      handleAgentEnd(agentEvent.messages, state);
      return;
    case "tool_execution_start":
      handleToolExecutionStart(agentEvent, state);
      return;
    case "tool_execution_end":
      handleToolExecutionEnd(agentEvent, state);
      return;
  }
}

function handleMessageStart(message: unknown, state: RunState) {
  const record = asRecord(message);
  if (record?.role !== "assistant") return;

  const item: TextDisplayItem = { type: "text", text: "" };
  state.displayItems.push(item);
  state.currentTextItem = item;
}

function handleMessageUpdate(agentEvent: Record<string, unknown>, state: RunState) {
  const delta = extractTextDelta(agentEvent.assistantMessageEvent);
  if (delta !== undefined) {
    const item = ensureCurrentTextItem(state);
    item.text += delta;
    state.output = item.text;
    return;
  }

  const assistantResult = extractAssistantResult(agentEvent.message);
  if (assistantResult?.text === undefined) return;

  const item = ensureCurrentTextItem(state);
  item.text = assistantResult.text;
  state.output = assistantResult.text;
}

function handleMessageEnd(message: unknown, state: RunState) {
  const assistantResult = extractAssistantResult(message);
  if (!assistantResult) return;

  if (assistantResult.text !== undefined) {
    const item = state.currentTextItem ?? ensureCurrentTextItem(state);
    item.text = assistantResult.text;
    state.output = assistantResult.text;
  }
  if (assistantResult.stopReason) state.stopReason = assistantResult.stopReason;
  if (assistantResult.errorMessage) state.errorMessage = assistantResult.errorMessage;

  state.currentTextItem = undefined;
  addUsageFromMessage(message, state.usage);
}

function handleAgentEnd(messages: unknown, state: RunState) {
  const assistantResult = extractFinalAssistantResult(messages);
  if (assistantResult?.text !== undefined) state.output = assistantResult.text;
  if (assistantResult?.stopReason) state.stopReason = assistantResult.stopReason;
  if (assistantResult?.errorMessage) state.errorMessage = assistantResult.errorMessage;
}

function handleToolExecutionStart(agentEvent: Record<string, unknown>, state: RunState) {
  const toolCallId = typeof agentEvent.toolCallId === "string" ? agentEvent.toolCallId : "";
  const item: ToolDisplayItem = {
    type: "tool",
    name: typeof agentEvent.toolName === "string" ? agentEvent.toolName : "tool",
    args: asRecord(agentEvent.args) ?? {},
    status: "running",
  };

  state.displayItems.push(item);
  if (toolCallId) state.toolItemsById.set(toolCallId, item);
}

function handleToolExecutionEnd(agentEvent: Record<string, unknown>, state: RunState) {
  const toolCallId = typeof agentEvent.toolCallId === "string" ? agentEvent.toolCallId : "";
  const toolName = typeof agentEvent.toolName === "string" ? agentEvent.toolName : "tool";
  let item = toolCallId ? state.toolItemsById.get(toolCallId) : undefined;

  if (!item) {
    item = { type: "tool", name: toolName, args: {}, status: "done" };
    state.displayItems.push(item);
    if (toolCallId) state.toolItemsById.set(toolCallId, item);
  }

  item.status = agentEvent.isError ? "error" : "done";
}

function ensureCurrentTextItem(state: RunState): TextDisplayItem {
  if (state.currentTextItem) return state.currentTextItem;

  const item: TextDisplayItem = { type: "text", text: "" };
  state.displayItems.push(item);
  state.currentTextItem = item;
  return item;
}

function renderSubagentResult(
  result: AgentToolResult<SubagentRunResult>,
  { expanded, isPartial }: ToolRenderResultOptions,
  theme: Theme,
) {
  const details = result.details;
  if (!details) {
    const text = result.content[0];
    return new Text(text?.type === "text" ? text.text : "(출력 없음)", 0, 0);
  }

  const view = getSubagentViewState(details, isPartial, theme);
  return expanded
    ? renderExpandedResult(details, view, theme)
    : renderCollapsedResult(details, view, theme);
}

function renderParallelSubagentResult(
  result: AgentToolResult<ParallelSubagentRunResult>,
  { expanded, isPartial }: ToolRenderResultOptions,
  theme: Theme,
) {
  const details = result.details;
  if (!details) {
    const text = result.content[0];
    return new Text(text?.type === "text" ? text.text : "(출력 없음)", 0, 0);
  }

  return expanded
    ? renderParallelExpandedResult(details, isPartial, theme)
    : renderParallelCollapsedResult(details, isPartial, theme);
}

function renderParallelExpandedResult(
  details: ParallelSubagentRunResult,
  isPartial: boolean,
  theme: Theme,
): Container {
  const container = new Container();
  container.addChild(new Text(formatParallelStatusLine(details, isPartial, theme), 0, 0));

  for (const child of details.children) {
    container.addChild(new Spacer(1));
    container.addChild(
      new Text(
        theme.fg("muted", `─── ${child.index}. ${formatParallelChildTitle(child)} ───`),
        0,
        0,
      ),
    );

    if (child.result) {
      const view = getSubagentViewState(child.result, child.status === "running", theme);
      container.addChild(renderExpandedResult(child.result, view, theme));
    } else {
      container.addChild(new Text(renderParallelChildLine(child, theme), 0, 0));
      container.addChild(new Text(theme.fg("dim", child.task), 0, 0));
      if (child.errorMessage?.trim()) {
        container.addChild(new Text(theme.fg("error", child.errorMessage.trim()), 0, 0));
      }
    }
  }

  return container;
}

function renderParallelCollapsedResult(
  details: ParallelSubagentRunResult,
  isPartial: boolean,
  theme: Theme,
): Text {
  let text = formatParallelStatusLine(details, isPartial, theme);
  const childLines = details.children
    .map((child) => renderParallelChildLine(child, theme))
    .join("\n");

  if (childLines) text += `\n${childLines}`;
  else text += `\n${theme.fg("muted", "(실행할 서브에이전트 없음)")}`;

  if (hasParallelExpandableContent(details)) {
    text += `\n${theme.fg("muted", `(${keyHint("app.tools.expand", "펼치기")})`)}`;
  }

  return new Text(text, 0, 0);
}

function getSubagentViewState(
  details: SubagentRunResult,
  isPartial: boolean,
  theme: Theme,
): SubagentViewState {
  const running = isPartial || details.exitCode === -1;
  const failed = !running && isFailedRun(details);
  const icon = running
    ? theme.fg("warning", "⏳")
    : failed
      ? theme.fg("error", "✗")
      : theme.fg("success", "✓");
  const statusLabel = formatSubagentStatus(details, running, failed);
  const title = details.title?.trim() ? ` ${theme.fg("accent", details.title.trim())}` : "";

  return { running, icon, status: statusLabel, title, meta: formatTokensMeta(details.usage) };
}

function isFailedRun(details: SubagentRunResult): boolean {
  return (
    details.aborted ||
    details.exitCode !== 0 ||
    details.stopReason === "error" ||
    details.stopReason === "aborted"
  );
}

function renderExpandedResult(
  details: SubagentRunResult,
  view: SubagentViewState,
  theme: Theme,
): Container {
  const container = new Container();
  container.addChild(new Text(formatStatusLine(view, theme), 0, 0));
  addSection(container, "작업", new Text(theme.fg("dim", details.task), 0, 0), theme);

  const toolItems = details.displayItems.filter(
    (item): item is ToolDisplayItem => item.type === "tool",
  );
  if (toolItems.length > 0) {
    addSection(
      container,
      "활동",
      new Text(renderDisplayItems(toolItems, undefined, theme), 0, 0),
      theme,
    );
  }

  addSection(container, "출력", renderOutput(details, view.running, theme), theme);

  const stderr = details.stderr.trim();
  if (stderr) addSection(container, "stderr", new Text(theme.fg("error", stderr), 0, 0), theme);

  return container;
}

function addSection(container: Container, title: string, content: Text | Markdown, theme: Theme) {
  container.addChild(new Spacer(1));
  container.addChild(new Text(theme.fg("muted", `─── ${title} ───`), 0, 0));
  container.addChild(content);
}

function renderOutput(details: SubagentRunResult, running: boolean, theme: Theme): Text | Markdown {
  const output = details.output.trim();
  if (!output) return new Text(theme.fg("muted", running ? "(실행 중...)" : "(출력 없음)"), 0, 0);
  return new Markdown(output, 0, 0, getMarkdownTheme());
}

function renderCollapsedResult(
  details: SubagentRunResult,
  view: SubagentViewState,
  theme: Theme,
): Text {
  let text = formatStatusLine(view, theme);
  const preview = renderRecentDisplayPreview(details.displayItems, PREVIEW_LINE_COUNT, theme);

  if (preview) text += `\n${preview}`;
  else if (view.running) text += `\n${theme.fg("muted", "(실행 중...)")}`;

  if (hasExpandableContent(details))
    text += `\n${theme.fg("muted", `(${keyHint("app.tools.expand", "펼치기")})`)}`;

  return new Text(text, 0, 0);
}

function hasExpandableContent(details: SubagentRunResult): boolean {
  return (
    details.displayItems.some((item) => item.type === "tool") ||
    Boolean(details.output.trim()) ||
    Boolean(details.stderr.trim())
  );
}

function extractFinalAssistantResult(messages: unknown): AssistantResult | undefined {
  if (!Array.isArray(messages)) return undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    const result = extractAssistantResult(messages[i]);
    if (result) return result;
  }

  return undefined;
}

function extractAssistantResult(message: unknown): AssistantResult | undefined {
  const record = asRecord(message);
  if (!record || record.role !== "assistant" || !Array.isArray(record.content)) return undefined;

  const text = record.content
    .map((part) => {
      const partRecord = asRecord(part);
      return partRecord?.type === "text" && typeof partRecord.text === "string"
        ? partRecord.text
        : undefined;
    })
    .filter((part): part is string => part !== undefined)
    .join("");

  return {
    text: text.length > 0 ? text : undefined,
    stopReason: typeof record.stopReason === "string" ? record.stopReason : undefined,
    errorMessage: typeof record.errorMessage === "string" ? record.errorMessage : undefined,
  };
}

function extractTextDelta(assistantMessageEvent: unknown): string | undefined {
  const agentEvent = asRecord(assistantMessageEvent);
  if (!agentEvent || agentEvent.type !== "text_delta") return undefined;
  return typeof agentEvent.delta === "string" ? agentEvent.delta : undefined;
}

function addUsageFromMessage(message: unknown, usage: SubagentUsageStats) {
  const record = asRecord(message);
  if (!record || record.role !== "assistant") return;

  const messageUsage = asRecord(record.usage);
  if (!messageUsage) return;

  usage.input += numberField(messageUsage, "input");
  usage.output += numberField(messageUsage, "output");
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseJsonObject(line: string): Record<string, unknown> | undefined {
  if (!line.trim()) return undefined;

  try {
    return asRecord(JSON.parse(line));
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function cloneDisplayItems(items: SubagentDisplayItem[]): SubagentDisplayItem[] {
  return items.map((item) =>
    item.type === "text" ? { ...item } : { ...item, args: { ...item.args } },
  );
}

function cloneSubagentResult(result: SubagentRunResult): SubagentRunResult {
  return {
    ...result,
    displayItems: cloneDisplayItems(result.displayItems),
    usage: { ...result.usage },
  };
}

function cloneParallelChildren(
  children: ParallelSubagentChildResult[],
): ParallelSubagentChildResult[] {
  return children.map((child) => ({
    ...child,
    result: child.result ? cloneSubagentResult(child.result) : undefined,
  }));
}

function sumParallelUsage(children: ParallelSubagentChildResult[]): SubagentUsageStats {
  return children.reduce<SubagentUsageStats>(
    (usage, child) => ({
      input: usage.input + (child.result?.usage.input ?? 0),
      output: usage.output + (child.result?.usage.output ?? 0),
    }),
    { input: 0, output: 0 },
  );
}

function hasParallelAbort(children: ParallelSubagentChildResult[]): boolean {
  return children.some((child) => child.result?.aborted || child.result?.stopReason === "aborted");
}

function isFailedChild(child: ParallelSubagentChildResult): boolean {
  return (
    child.status === "error" ||
    (child.status !== "running" && Boolean(child.result && isFailedRun(child.result)))
  );
}

function hasParallelFailure(children: ParallelSubagentChildResult[]): boolean {
  return children.some(isFailedChild);
}

function formatToolContent(result: SubagentRunResult): string {
  const parts: string[] = [];
  if (result.output.trim()) parts.push(result.output.trim());
  if (result.errorMessage?.trim()) parts.push(`오류 메시지:\n${result.errorMessage.trim()}`);
  if (result.stderr.trim()) parts.push(`stderr:\n${result.stderr.trim()}`);
  return parts.join("\n\n") || "(출력 없음)";
}

function formatSubagentStatus(
  details: SubagentRunResult,
  running: boolean,
  failed: boolean,
): string {
  if (running) return "서브에이전트 실행 중";
  if (details.aborted || details.stopReason === "aborted") return "서브에이전트 중단";
  if (failed) return "서브에이전트 실패";
  return "서브에이전트 완료";
}

function formatStatusLine(view: SubagentViewState, theme: Theme): string {
  const meta = view.meta ? theme.fg("muted", ` (${view.meta})`) : "";
  return `${view.icon} ${view.status}${view.title}${meta}`;
}

function formatTokensMeta(usage: SubagentUsageStats): string {
  const totalTokens = usage.input + usage.output;
  return totalTokens > 0 ? formatTokens(totalTokens) : "";
}

function formatProgressContent(details: SubagentRunResult): string {
  const title = details.title?.trim() ? ` ${details.title.trim()}` : "";
  const meta = formatTokensMeta(details.usage);
  const preview = renderRecentDisplayPreview(details.displayItems, PREVIEW_LINE_COUNT, PLAIN_THEME);
  return `서브에이전트 실행 중${title}${meta ? ` (${meta})` : ""}${preview ? `\n${preview}` : ""}`;
}

function formatParallelToolContent(result: ParallelSubagentRunResult): string {
  const header = result.failed ? "병렬 서브에이전트 결과(일부 실패)" : "병렬 서브에이전트 결과";
  const children = result.children.map(formatParallelChildContent).join("\n\n---\n\n");
  return `${header}\n\n${children || "(출력 없음)"}`;
}

function formatParallelChildContent(child: ParallelSubagentChildResult): string {
  const parts = [
    `### ${child.index}. ${formatParallelChildTitle(child)}`,
    `상태: ${formatParallelChildStatus(child)}`,
    `작업:\n${child.task}`,
  ];

  if (child.result) parts.push(formatToolContent(child.result));
  else if (child.errorMessage?.trim()) parts.push(`오류 메시지:\n${child.errorMessage.trim()}`);
  else parts.push("(출력 없음)");

  return parts.join("\n\n");
}

function formatParallelProgressContent(details: ParallelSubagentRunResult): string {
  const childLines = details.children
    .map((child) => renderParallelChildLine(child, PLAIN_THEME))
    .join("\n");
  return `${formatPlainParallelStatusLine(details)}${childLines ? `\n${childLines}` : ""}`;
}

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

function formatParallelStatusLine(
  details: ParallelSubagentRunResult,
  isPartial: boolean,
  theme: Theme,
): string {
  const running = isPartial || details.children.some((child) => child.status === "running");
  const failedCount = countParallelFailures(details.children);
  const icon = running
    ? theme.fg("warning", "⏳")
    : failedCount > 0
      ? theme.fg("error", "✗")
      : theme.fg("success", "✓");
  const statusLabel = formatPlainParallelStatusLine(details, running, failedCount);
  const meta = formatTokensMeta(details.usage);
  return `${icon} ${statusLabel}${meta ? theme.fg("muted", ` (${meta})`) : ""}`;
}

function formatPlainParallelStatusLine(
  details: ParallelSubagentRunResult,
  running = details.children.some((child) => child.status === "running"),
  failedCount = countParallelFailures(details.children),
): string {
  const total = details.children.length;
  const finished = details.children.filter((child) => child.status !== "running").length;
  if (running) return `병렬 서브에이전트 실행 중 ${finished}/${total}`;
  if (failedCount > 0) return `병렬 서브에이전트 일부 실패 ${total - failedCount}/${total}`;
  return `병렬 서브에이전트 완료 ${total}/${total}`;
}

function countParallelFailures(children: ParallelSubagentChildResult[]): number {
  return children.filter(isFailedChild).length;
}

function renderParallelChildLine(child: ParallelSubagentChildResult, theme: ThemeLike): string {
  const statusLabel = formatParallelChildStatus(child);
  const meta = child.result ? formatTokensMeta(child.result.usage) : "";
  let line = `${formatStatusIcon(child.status, theme)} ${theme.fg("accent", formatParallelChildTitle(child))} ${theme.fg("muted", statusLabel)}${meta ? theme.fg("muted", ` (${meta})`) : ""}`;
  const preview = child.result
    ? renderRecentDisplayPreview(child.result.displayItems, 1, theme)
    : "";

  if (preview) line += `\n  ${preview}`;
  else if (child.errorMessage?.trim()) {
    line += `\n  ${theme.fg("error", truncateInline(child.errorMessage.trim(), PREVIEW_LINE_MAX_CHARS))}`;
  }

  return line;
}

function formatStatusIcon(toolStatus: ToolStatus, theme: ThemeLike): string {
  if (toolStatus === "running") return theme.fg("warning", "⏳");
  if (toolStatus === "error") return theme.fg("error", "✗");
  return theme.fg("success", "✓");
}

function formatParallelChildTitle(child: ParallelSubagentChildResult): string {
  return child.title?.trim() || `agent ${child.index}`;
}

function formatParallelChildStatus(child: ParallelSubagentChildResult): string {
  if (child.status === "running") return "실행 중";
  if (child.result?.aborted || child.result?.stopReason === "aborted") return "중단";
  if (child.status === "error") return "실패";
  return "완료";
}

function hasParallelExpandableContent(details: ParallelSubagentRunResult): boolean {
  return details.children.some((child) => child.result || Boolean(child.errorMessage?.trim()));
}

function renderDisplayItems(
  items: SubagentDisplayItem[],
  limit: number | undefined,
  theme: ThemeLike,
): string {
  const visibleItems = items.filter(hasVisibleDisplayItem);
  const displayedItems = limit ? visibleItems.slice(-limit) : visibleItems;
  const skipped = visibleItems.length - displayedItems.length;
  const lines: string[] = [];

  if (skipped > 0) lines.push(theme.fg("muted", `... ${skipped}개 이전 항목`));

  for (const item of displayedItems) {
    lines.push(
      item.type === "text"
        ? theme.fg("toolOutput", formatTextPreview(item.text))
        : renderToolItem(item, theme),
    );
  }

  return lines.join("\n");
}

function hasVisibleDisplayItem(item: SubagentDisplayItem): boolean {
  return item.type !== "text" || item.text.trim().length > 0;
}

function renderRecentDisplayPreview(
  items: SubagentDisplayItem[],
  limit: number,
  theme: ThemeLike,
): string {
  return collectPreviewLines(items)
    .slice(-limit)
    .map((line) =>
      line.type === "text"
        ? theme.fg("toolOutput", line.text)
        : renderToolItem(line.item, PLAIN_THEME),
    )
    .join("\n");
}

function collectPreviewLines(items: SubagentDisplayItem[]): PreviewLine[] {
  const lines: PreviewLine[] = [];

  for (const item of items) {
    if (item.type === "tool") {
      lines.push({ type: "tool", item });
      continue;
    }

    for (const text of splitPreviewTextLines(item.text)) lines.push({ type: "text", text });
  }

  return lines;
}

function splitPreviewTextLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => truncateInline(line, PREVIEW_LINE_MAX_CHARS));
}

function formatTextPreview(text: string): string {
  const lines = splitPreviewTextLines(text).slice(0, 1).join("\n");
  return truncateInline(lines, PREVIEW_LINE_MAX_CHARS);
}

function renderToolItem(item: ToolDisplayItem, theme: ThemeLike): string {
  const icon =
    item.status === "running"
      ? theme.fg("warning", "⏳")
      : item.status === "error"
        ? theme.fg("error", "✗")
        : theme.fg("success", "✓");
  return `${icon} ${formatToolCall(item, theme)}`;
}

function formatToolCall(item: ToolDisplayItem, theme: ThemeLike): string {
  switch (item.name) {
    case "bash":
      return (
        theme.fg("muted", "$ ") +
        theme.fg("toolOutput", truncateInline(stringArg(item.args.command, "..."), 80))
      );
    case "read":
      return formatPathToolCall(
        "read",
        item,
        theme,
        theme.fg("warning", formatReadRange(item.args)),
        "...",
      );
    case "grep":
      return formatSearchToolCall(
        "grep",
        `/${truncateInline(stringArg(item.args.pattern, ""), 50)}/`,
        item,
        theme,
      );
    case "find":
      return formatSearchToolCall(
        "find",
        truncateInline(stringArg(item.args.pattern, "*"), 50),
        item,
        theme,
      );
    case "ls":
      return formatPathToolCall("ls", item, theme, "", ".");
    case "write":
    case "edit":
      return formatPathToolCall(item.name, item, theme, "", "...");
    default:
      return (
        theme.fg("accent", item.name) +
        theme.fg("dim", ` ${truncateInline(JSON.stringify(item.args), 80)}`)
      );
  }
}

function formatPathToolCall(
  toolName: string,
  item: ToolDisplayItem,
  theme: ThemeLike,
  suffix = "",
  fallbackPath = "...",
): string {
  return (
    theme.fg("muted", `${toolName} `) +
    theme.fg("accent", getToolPath(item.args, fallbackPath)) +
    suffix
  );
}

function formatSearchToolCall(
  toolName: string,
  pattern: string,
  item: ToolDisplayItem,
  theme: ThemeLike,
): string {
  return (
    theme.fg("muted", `${toolName} `) +
    theme.fg("accent", pattern) +
    theme.fg("dim", ` in ${getToolPath(item.args, ".")}`)
  );
}

function formatReadRange(args: Record<string, unknown>): string {
  const offset = numberArg(args.offset);
  const limit = numberArg(args.limit);
  if (offset === undefined && limit === undefined) return "";
  const start = offset ?? 1;
  return `:${start}${limit !== undefined ? `-${start + limit - 1}` : ""}`;
}

function getToolPath(args: Record<string, unknown>, fallback: string): string {
  return shortenPath(stringArg(args.path ?? args.file_path, fallback));
}

function stringArg(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function numberArg(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function shortenPath(value: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return home && value.startsWith(home) ? `~${value.slice(home.length)}` : value;
}

function truncateInline(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}
