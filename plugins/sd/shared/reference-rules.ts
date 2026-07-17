import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function buildRulesReferenceContext(options: {
  pluginRoot: string;
}): Promise<string | undefined> {
  const pluginRoot = options.pluginRoot;
  if (!pluginRoot) return undefined;

  const rulesDir = join(pluginRoot, "rules");
  if (!existsSync(rulesDir)) return undefined;

  const rulePaths = await findRulePaths(rulesDir);
  const ruleTexts = await Promise.all(
    rulePaths.map(async (rulePath) => {
      const content = await readFile(rulePath, "utf8");
      return stripFrontmatter(content).trim();
    }),
  );

  const context = ruleTexts.filter(Boolean).join("\n\n");
  if (!context) return undefined;

  return context.replaceAll("${CLAUDE_PLUGIN_ROOT}", toPosixPath(pluginRoot));
}

/**
 * rules 파일 1개만 읽어 반환한다. Claude Code 훅은 stdout 1개당 주입 1건이고 출력이 크면
 * 잘려 파일로 밀려나므로, 파일별 훅으로 나눠 주입하기 위해 쓴다.
 * (Pi 는 buildRulesReferenceContext 로 전체를 시스템 프롬프트에 붙이므로 이 함수를 쓰지 않는다.)
 */
export async function buildRuleFileContext(options: {
  pluginRoot: string;
  fileName: string;
}): Promise<string | undefined> {
  const pluginRoot = options.pluginRoot;
  if (!pluginRoot) return undefined;

  const rulePath = join(pluginRoot, "rules", options.fileName);
  if (!existsSync(rulePath)) return undefined;

  const content = stripFrontmatter(await readFile(rulePath, "utf8")).trim();
  if (!content) return undefined;

  return content.replaceAll("${CLAUDE_PLUGIN_ROOT}", toPosixPath(pluginRoot));
}

async function findRulePaths(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dirPath, entry.name);
      if (entry.isDirectory()) return findRulePaths(entryPath);
      if (entry.isFile() && entry.name.endsWith(".md")) return [entryPath];
      return [];
    }),
  );

  return paths.flat().sort((a, b) => toPosixPath(a).localeCompare(toPosixPath(b)));
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
