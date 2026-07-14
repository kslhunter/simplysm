import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function buildOutputStyleContext(options: {
  pluginRoot: string;
}): Promise<string | undefined> {
  const pluginRoot = options.pluginRoot;
  if (!pluginRoot) return undefined;

  const stylesDir = join(pluginRoot, "output-styles");
  if (!existsSync(stylesDir)) return undefined;

  const stylePaths = await findStylePaths(stylesDir);
  const styleTexts = await Promise.all(
    stylePaths.map(async (stylePath) => {
      const content = await readFile(stylePath, "utf8");
      return stripFrontmatter(content).trim();
    }),
  );

  const context = styleTexts.filter(Boolean).join("\n\n");
  if (!context) return undefined;

  return context.replaceAll("${CLAUDE_PLUGIN_ROOT}", toPosixPath(pluginRoot));
}

async function findStylePaths(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dirPath, entry.name);
      if (entry.isDirectory()) return findStylePaths(entryPath);
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
