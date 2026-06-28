import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadWikiRulesContext(pluginRoot: string, wikiCommandRoot: string = pluginRoot): Promise<string | undefined> {
  const rulesDir = join(pluginRoot, "rules");
  const fileNames = (await readdir(rulesDir)).filter((fileName) => fileName.endsWith(".md")).sort();
  const sections: string[] = [];

  for (const fileName of fileNames) {
    const text = await readFile(join(rulesDir, fileName), "utf8");
    sections.push(text.replaceAll("${CLAUDE_PLUGIN_ROOT}", wikiCommandRoot));
  }

  return sections.length === 0 ? undefined : sections.join("\n\n");
}
