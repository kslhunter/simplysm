import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function buildWikiReferenceContext(options: {
  pluginRoot: string;
  wikiCommandRoot?: string;
}): Promise<string | undefined> {
  const pluginRoot = options.pluginRoot;
  if (!pluginRoot) return undefined;

  const referencePath = join(pluginRoot, "references", "wiki.md");
  if (!existsSync(referencePath)) return undefined;

  const wikiCommandRoot = toPosixPath(options.wikiCommandRoot ?? pluginRoot);
  return (await readFile(referencePath, "utf8"))
    .trim()
    .replaceAll("${CLAUDE_PLUGIN_ROOT}", wikiCommandRoot);
}

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
