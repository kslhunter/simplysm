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
