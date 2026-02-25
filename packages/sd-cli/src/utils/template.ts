import path from "path";
import Handlebars from "handlebars";
import { fsCopy, fsMkdir, fsRead, fsReaddir, fsStat, fsWrite } from "@simplysm/core-node";

/**
 * Recursively traverse template directory, render with Handlebars, and generate files
 *
 * - `.hbs` extension files: Compile with Handlebars → save with `.hbs` removed from name
 * - If `.hbs` result is empty string/whitespace only: skip file creation
 * - Other files: copy as-is (binary)
 *
 * @param srcDir - Template source directory
 * @param destDir - Output destination directory
 * @param context - Handlebars template variables
 * @param dirReplacements - Directory name substitution map (e.g., `{ __CLIENT__: "client-admin" }`)
 */
export async function renderTemplateDir(
  srcDir: string,
  destDir: string,
  context: Record<string, unknown>,
  dirReplacements?: Record<string, string>,
): Promise<void> {
  await fsMkdir(destDir);

  const entries = await fsReaddir(srcDir);

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const stat = await fsStat(srcPath);

    if (stat.isDirectory()) {
      // Apply directory name substitution
      const destName = dirReplacements?.[entry] ?? entry;
      await renderTemplateDir(
        path.join(srcDir, entry),
        path.join(destDir, destName),
        context,
        dirReplacements,
      );
    } else if (entry.endsWith(".hbs")) {
      // Render Handlebars template
      const source = await fsRead(srcPath);
      const template = Handlebars.compile(source, { noEscape: true });
      const result = template(context);

      // Skip file creation if result is empty or whitespace-only
      if (result.trim().length === 0) continue;

      const destFileName = entry.slice(0, -4); // Remove .hbs
      await fsWrite(path.join(destDir, destFileName), result);
    } else {
      // Copy binary files as-is
      await fsCopy(srcPath, path.join(destDir, entry));
    }
  }
}
