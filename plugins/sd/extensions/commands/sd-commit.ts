import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Api, Model } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const GPT_CODE_SPARK_MODEL_PATTERN = /^gpt-(\d+(?:\.\d+)*)-codex-spark$/;

const sdCommitCommandPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../commands/sd-commit.md",
);
const sdCommitCommand = readCommandFile(sdCommitCommandPath);

export function registerSdCommit(pi: ExtensionAPI) {
  pi.registerCommand("sd-commit", {
    description:
      sdCommitCommand.frontmatter.description ??
      "변경분을 확인해 conventional commits 메시지를 작성하고 git commit까지 수행",
    handler: async (_args, ctx) => {
      if (!ctx.isIdle()) await ctx.waitForIdle();

      await switchGptModelToCodeSpark(pi, ctx);
      pi.sendUserMessage(sdCommitCommand.content);
    },
  });
}

async function switchGptModelToCodeSpark(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  const currentModel = ctx.model;
  if (!currentModel?.id.startsWith("gpt-")) return;

  const targetModel = findLatestCodeSparkModel(ctx, currentModel);
  if (!targetModel) {
    throw new Error(
      `현재 provider(${currentModel.provider})에서 사용 가능한 gpt-*-codex-spark 모델을 찾을 수 없습니다.`,
    );
  }

  if (targetModel.provider === currentModel.provider && targetModel.id === currentModel.id) return;

  const switched = await pi.setModel(targetModel);
  if (!switched) {
    throw new Error(
      `gpt code-spark 모델 인증이 설정되어 있지 않습니다: ${targetModel.provider}/${targetModel.id}`,
    );
  }
}

function findLatestCodeSparkModel(
  ctx: ExtensionCommandContext,
  currentModel: Model<Api>,
): Model<Api> | undefined {
  return pickLatestCodeSparkModel(
    ctx.modelRegistry
      .getAvailable()
      .filter((item) => item.provider === currentModel.provider)
      .filter(isCodeSparkModel),
  );
}

function pickLatestCodeSparkModel(models: Model<Api>[]): Model<Api> | undefined {
  return [...models].sort(compareCodeSparkModels).at(-1);
}

function compareCodeSparkModels(left: Model<Api>, right: Model<Api>): number {
  const leftVersion = parseCodeSparkVersion(left.id);
  const rightVersion = parseCodeSparkVersion(right.id);
  const maxLength = Math.max(leftVersion.length, rightVersion.length);

  for (let i = 0; i < maxLength; i++) {
    const diff = (leftVersion[i] ?? 0) - (rightVersion[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function parseCodeSparkVersion(modelId: string): number[] {
  return GPT_CODE_SPARK_MODEL_PATTERN.exec(modelId)?.[1]?.split(".").map(Number) ?? [];
}

function isCodeSparkModel(model: Model<Api>): boolean {
  return GPT_CODE_SPARK_MODEL_PATTERN.test(model.id);
}

function readCommandFile(filePath: string): {
  frontmatter: Record<string, string>;
  content: string;
} {
  const fileContent = readFileSync(filePath, "utf8");
  const parsed = parseMarkdownWithFrontmatter(fileContent);
  if (!parsed.content) throw new Error("sd-commit 명령 본문이 비어 있습니다.");

  return parsed;
}

function parseMarkdownWithFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  content: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (!match) return { frontmatter: {}, content: content.trim() };

  return {
    frontmatter: parseFrontmatter(match[1] ?? ""),
    content: (match[2] ?? "").trim(),
  };
}

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key) continue;

    result[key] = line.slice(separatorIndex + 1).trim();
  }

  return result;
}
