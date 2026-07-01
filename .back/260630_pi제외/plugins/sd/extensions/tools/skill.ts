import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  defineTool,
  type ExtensionAPI,
  type ExtensionContext,
  type SlashCommandInfo,
} from "@earendil-works/pi-coding-agent";
import { Box, Container, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const SKILL_COMMAND_PREFIX = "/skill:";
const SKILL_COMMAND_NAME_PREFIX = "skill:";
const SKILL_STATE_CUSTOM_TYPE = "simplysm-pi.skill-state";
const SKILL_MESSAGE_CUSTOM_TYPE = "simplysm-pi.skill";

const SkillParams = Type.Object({
  name: Type.String({ description: "호출할 Pi skill 이름" }),
  arguments: Type.Optional(Type.String({ description: "skill에 전달할 사용자 인자" })),
});

interface ResolvedSkill {
  name: string;
  filePath: string;
  baseDir: string;
}

interface InvokedSkill {
  sequence: number;
  name: string;
  filePath: string;
  baseDir: string;
  arguments?: string;
}

interface SkillInvocationState {
  version: 1;
  invoked: InvokedSkill[];
  current?: InvokedSkill;
  nextSequence: number;
}

interface LoadedSkillInvocation {
  skill: ResolvedSkill;
  arguments?: string;
  content: string;
}

interface SkillCommand {
  name: string;
  arguments?: string;
}

interface SkillInvocationDetails {
  invocation: InvokedSkill;
  state: SkillInvocationState;
  sourceText?: string;
}

export function registerSkill(pi: ExtensionAPI) {
  let skillState = createEmptySkillState();

  const reconstructState = (ctx: ExtensionContext) => {
    skillState = reconstructSkillState(ctx);
  };

  const recordInvocation = (
    skill: ResolvedSkill,
    skillArguments?: string,
  ): SkillInvocationDetails => {
    const invocation: InvokedSkill = {
      sequence: skillState.nextSequence,
      name: skill.name,
      filePath: skill.filePath,
      baseDir: skill.baseDir,
      arguments: skillArguments,
    };

    skillState = cloneState({
      version: 1,
      invoked: [...skillState.invoked, invocation],
      current: invocation,
      nextSequence: invocation.sequence + 1,
    });

    return { invocation: { ...invocation }, state: cloneState(skillState) };
  };

  pi.on("session_start", async (_event, ctx) => reconstructState(ctx));
  pi.on("session_tree", async (_event, ctx) => reconstructState(ctx));
  pi.on("session_compact", async (_event, ctx) => reconstructState(ctx));

  pi.on("before_agent_start", async (event) => {
    const reminder = formatSkillReminder(skillState);
    if (!reminder) return;

    return {
      systemPrompt: `${event.systemPrompt}\n\n${reminder}`,
    };
  });

  pi.registerMessageRenderer<SkillInvocationDetails>(
    SKILL_MESSAGE_CUSTOM_TYPE,
    (message, { expanded }, theme) => {
      const invocation = message.details?.invocation;
      const skillName = invocation?.name ?? "unknown";
      const suffix = invocation?.arguments?.trim()
        ? ` ${theme.fg("dim", JSON.stringify(invocation.arguments.trim()))}`
        : "";
      const box = new Box(1, 1, (text: string) => theme.bg("toolSuccessBg", text));
      box.addChild(
        new Text(
          `${theme.fg("toolTitle", theme.bold("skill"))} ${theme.fg("accent", skillName)}${suffix}`,
          0,
          0,
        ),
      );

      if (expanded) {
        box.addChild(new Spacer(1));
        box.addChild(new Text(getMessageTextContent(message.content), 0, 0));
      }

      const sourceText = message.details?.sourceText?.trim();
      if (!sourceText) return box;

      const sourceBox = new Box(1, 1, (text: string) => theme.bg("userMessageBg", text));
      sourceBox.addChild(new Text(theme.fg("userMessageText", sourceText), 0, 0));

      const container = new Container();
      container.addChild(sourceBox);
      container.addChild(new Spacer(1));
      container.addChild(box);
      return container;
    },
  );

  pi.registerTool(
    defineTool<typeof SkillParams, SkillInvocationDetails>({
      name: "skill",
      label: "Skill",
      description: "Pi skill을 명시적으로 호출하여 해당 SKILL.md 지침을 현재 작업에 로드합니다.",
      promptSnippet: "Pi skill을 명시적으로 호출하여 SKILL.md 지침을 로드합니다.",
      promptGuidelines: [
        "skill 도구는 해당 SKILL.md 지침을 현재 작업에 로드하여 후속 응답에 영향을 주는 호출입니다.",
        "사용자가 특정 skill 적용, 로드, 호출, 사용을 명시적으로 요청하면 반드시 skill 도구를 먼저 호출하세요.",
        "사용자가 skill 내용을 보기, 확인, 검토, 읽기만 요청한 경우에는 skill 도구를 사용하지 말고 read로 해당 SKILL.md를 확인하세요.",
        "SKILL.md 파일 자체를 검토하거나 수정해야 할 때도 read를 사용하세요. read는 skill 호출 상태를 바꾸지 않습니다.",
      ],
      parameters: SkillParams,
      executionMode: "sequential",

      renderCall(args, theme) {
        const skillName = typeof args.name === "string" ? args.name : "";
        const suffix = args.arguments?.trim()
          ? ` ${theme.fg("dim", JSON.stringify(args.arguments.trim()))}`
          : "";
        return new Text(
          `${theme.fg("toolTitle", theme.bold("skill"))} ${theme.fg("accent", skillName)}${suffix}`,
          0,
          0,
        );
      },

      async execute(_toolCallId, params) {
        const loaded = await loadSkillInvocation(pi, params.name, params.arguments);
        const stateData = recordInvocation(loaded.skill, loaded.arguments);

        return {
          content: [{ type: "text" as const, text: loaded.content }],
          details: stateData,
        };
      },

      renderResult(result, { expanded }) {
        const details = result.details;
        if (!details) return new Text(getFirstTextContent(result.content), 0, 0);

        if (!expanded) return new Container();

        return new Text(getFirstTextContent(result.content), 0, 0);
      },
    }),
  );

  pi.on("input", async (event) => {
    if (event.source === "extension") return { action: "continue" };
    if (!event.text.startsWith(SKILL_COMMAND_PREFIX)) return { action: "continue" };

    const parsed = parseSkillCommand(event.text);
    if (!parsed) return { action: "continue" };

    const skill = findSkill(pi, parsed.name);
    if (!skill) return { action: "continue" };

    const loaded = await loadResolvedSkillInvocation(skill, parsed.arguments);
    const stateData = recordInvocation(loaded.skill, loaded.arguments);
    const content = event.images?.length
      ? [{ type: "text" as const, text: loaded.content }, ...event.images]
      : loaded.content;
    const details: SkillInvocationDetails = { ...stateData, sourceText: event.text };

    pi.sendMessage<SkillInvocationDetails>(
      {
        customType: SKILL_MESSAGE_CUSTOM_TYPE,
        content,
        display: true,
        details,
      },
      event.streamingBehavior ? { deliverAs: event.streamingBehavior } : { triggerTurn: true },
    );

    return { action: "handled" };
  });
}

async function loadSkillInvocation(
  pi: ExtensionAPI,
  skillName: string,
  rawArguments?: string,
): Promise<LoadedSkillInvocation> {
  const normalizedName = skillName.trim();
  if (!normalizedName) throw new Error("skill 이름이 비어 있습니다.");

  const skill = findSkill(pi, normalizedName);
  if (!skill) throw new Error(`skill을 찾을 수 없습니다: ${normalizedName}`);

  return loadResolvedSkillInvocation(skill, rawArguments);
}

async function loadResolvedSkillInvocation(
  skill: ResolvedSkill,
  rawArguments?: string,
): Promise<LoadedSkillInvocation> {
  const fileContent = await readFile(skill.filePath, "utf8");
  const skillBlock = formatSkillBlock(skill, stripFrontmatter(fileContent).trim());
  const skillArguments = normalizeSkillArguments(rawArguments);

  return {
    skill,
    arguments: skillArguments,
    content: skillArguments ? `${skillBlock}\n\nUser: ${skillArguments}` : skillBlock,
  };
}

function formatSkillBlock(skill: ResolvedSkill, body: string): string {
  return [
    `<skill name="${escapeXmlAttribute(skill.name)}" location="${escapeXmlAttribute(skill.filePath)}">`,
    `References are relative to ${skill.baseDir}.`,
    "",
    body,
    "</skill>",
  ].join("\n");
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeSkillArguments(rawArguments?: string): string | undefined {
  return rawArguments?.trim() || undefined;
}

function getFirstTextContent(content: readonly { type: string; text?: string }[]): string {
  const first = content[0];
  return first?.type === "text" ? (first.text ?? "") : "(skill 출력 없음)";
}

function getMessageTextContent(
  content: string | readonly { type: string; text?: string }[],
): string {
  if (typeof content === "string") return content;

  const text = content
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n");
  return text || "(skill 출력 없음)";
}

function findSkill(pi: ExtensionAPI, skillName: string): ResolvedSkill | undefined {
  const command = pi
    .getCommands()
    .find(
      (item) => item.source === "skill" && item.name === `${SKILL_COMMAND_NAME_PREFIX}${skillName}`,
    );
  if (!command) return undefined;
  return toResolvedSkill(command);
}

function toResolvedSkill(command: SlashCommandInfo): ResolvedSkill {
  return {
    name: command.name.slice(SKILL_COMMAND_NAME_PREFIX.length),
    filePath: command.sourceInfo.path,
    baseDir: command.sourceInfo.baseDir ?? dirname(command.sourceInfo.path),
  };
}

function parseSkillCommand(text: string): SkillCommand | undefined {
  if (!text.startsWith(SKILL_COMMAND_PREFIX)) return undefined;

  const separatorIndex = text.search(/\s/);
  const skillName =
    separatorIndex === -1
      ? text.slice(SKILL_COMMAND_PREFIX.length)
      : text.slice(SKILL_COMMAND_PREFIX.length, separatorIndex);
  if (!skillName) return undefined;

  const rawArguments = separatorIndex === -1 ? "" : text.slice(separatorIndex + 1).trim();
  return { name: skillName, arguments: rawArguments || undefined };
}

function reconstructSkillState(ctx: ExtensionContext): SkillInvocationState {
  let restored = createEmptySkillState();

  for (const entry of ctx.sessionManager.getBranch() as unknown[]) {
    const entryState = extractSkillState(entry);
    if (entryState) restored = entryState;
  }

  return restored;
}

function extractSkillState(entry: unknown): SkillInvocationState | undefined {
  const record = asRecord(entry);
  if (!record) return undefined;

  if (record.type === "custom" && record.customType === SKILL_STATE_CUSTOM_TYPE) {
    const data = asRecord(record.data);
    return normalizeSkillState(data?.state ?? data);
  }

  if (record.type === "custom_message" && record.customType === SKILL_MESSAGE_CUSTOM_TYPE) {
    const details = asRecord(record.details);
    return normalizeSkillState(details?.state);
  }

  if (record.type !== "message") return undefined;

  const message = asRecord(record.message);
  if (!message || message.role !== "toolResult" || message.toolName !== "skill") return undefined;

  const details = asRecord(message.details);
  return normalizeSkillState(details?.state);
}

function normalizeSkillState(value: unknown): SkillInvocationState | undefined {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.invoked)) return undefined;

  const invoked = record.invoked
    .map(normalizeInvokedSkill)
    .filter((item): item is InvokedSkill => item !== undefined)
    .sort((a, b) => a.sequence - b.sequence);
  if (invoked.length === 0) return createEmptySkillState();

  const current = normalizeInvokedSkill(record.current) ?? invoked[invoked.length - 1];
  const highestSequence = invoked.reduce((max, item) => Math.max(max, item.sequence), 0);
  const rawNextSequence = record.nextSequence;
  const nextSequence =
    typeof rawNextSequence === "number" &&
    Number.isInteger(rawNextSequence) &&
    rawNextSequence > highestSequence
      ? rawNextSequence
      : highestSequence + 1;

  return cloneState({ version: 1, invoked, current, nextSequence });
}

function normalizeInvokedSkill(value: unknown): InvokedSkill | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  if (
    typeof record.sequence !== "number" ||
    !Number.isInteger(record.sequence) ||
    record.sequence < 1 ||
    typeof record.name !== "string" ||
    typeof record.filePath !== "string" ||
    typeof record.baseDir !== "string"
  ) {
    return undefined;
  }

  const skillArguments = typeof record.arguments === "string" ? record.arguments : undefined;
  return {
    sequence: record.sequence,
    name: record.name,
    filePath: record.filePath,
    baseDir: record.baseDir,
    arguments: skillArguments,
  };
}

function formatSkillReminder(state: SkillInvocationState): string | undefined {
  if (!state.current || state.invoked.length === 0) return undefined;

  const invokedList = state.invoked.map((item) => `#${item.sequence} ${item.name}`).join(" -> ");
  return [
    "## Pi skill reminder",
    `- 호출된 skill 순서: ${invokedList}`,
    `- current focus: ${state.current.name} (${state.current.filePath})`,
    "- 후속 응답에서도 current focus skill 지침을 우선 유지하세요.",
    "- read SKILL.md는 파일 읽기일 뿐이며, skill 호출 상태를 바꾸지 않습니다.",
  ].join("\n");
}

function createEmptySkillState(): SkillInvocationState {
  return { version: 1, invoked: [], nextSequence: 1 };
}

function cloneState(state: SkillInvocationState): SkillInvocationState {
  return {
    version: 1,
    invoked: state.invoked.map((item) => ({ ...item })),
    current: state.current ? { ...state.current } : undefined,
    nextSequence: state.nextSequence,
  };
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
