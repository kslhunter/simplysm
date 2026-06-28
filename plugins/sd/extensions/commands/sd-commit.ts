import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

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

      pi.sendUserMessage(sdCommitCommand.content);
    },
  });
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
