import path from "path";
import { pathx } from "@simplysm/core-node";

/**
 * Add .js extension to extensionless relative import/export paths in ESM output.
 *
 * Matches: from "./foo", import("./bar"), from "../baz"
 * Skips: bare specifiers ("lodash"), paths already ending with known extensions (.js, .json, .css, etc.)
 */
export function addJsExtensionToImports(text: string): string {
  return text.replace(
    /((?:from|import)\s*(?:\(\s*)?["'])(\.\.?\/[^"']*?)(["'](?:\s*\))?)/g,
    (_match, prefix: string, importPath: string, suffix: string) => {
      if (/\.(js|mjs|cjs|json|css|scss|wasm|node)$/i.test(importPath)) return _match;
      return `${prefix}${importPath}.js${suffix}`;
    },
  );
}

/**
 * Rewrite relative .scss imports to .css in emitted JS text.
 * Returns the transformed text and the list of original .scss import paths.
 *
 * Matches: import "./foo.scss", import("./bar.scss"), from "../baz.scss"
 * Only processes relative imports (starting with ./ or ../).
 */
export function rewriteScssImports(text: string): { text: string; scssImports: string[] } {
  const scssImports: string[] = [];
  const rewritten = text.replace(
    /((?:from|import)\s*(?:\(\s*)?["'])(\.\.?\/[^"']*?)(\.scss)(["'](?:\s*\))?)/g,
    (_match, prefix: string, importBase: string, _ext: string, suffix: string) => {
      scssImports.push(`${importBase}.scss`);
      return `${prefix}${importBase}.css${suffix}`;
    },
  );
  return { text: rewritten, scssImports };
}

/**
 * Adjust sources path in .d.ts.map file to new location
 */
export function adjustMapSources(content: string, originalDir: string, newDir: string): string {
  if (originalDir === newDir) return content;
  try {
    const map = JSON.parse(content) as { sources?: string[] };
    if (Array.isArray(map.sources)) {
      map.sources = map.sources.map((source) => {
        const absoluteSource = path.resolve(originalDir, source);
        return path.relative(newDir, absoluteSource);
      });
    }
    return JSON.stringify(map);
  } catch {
    return content;
  }
}

/**
 * Create path rewriter function for NgtscProgram output files (.js, .d.ts, .d.ts.map)
 *
 * TypeScript/NgtscProgram includes other package sources referenced via path alias (@simplysm/*)
 * in rootDir calculation, so output is generated as nested structure dist/{pkgName}/src/...
 * The returned function rewrites only this package's output to flat structure (dist/...)
 * and ignores output from other packages.
 *
 * @returns (fileName, content) => [newPath, newContent] | null (null to skip writing)
 */
export function createOutputPathRewriter(
  pkgDir: string,
): (fileName: string, content: string) => [string, string] | null {
  const pkgName = path.basename(pkgDir);
  const distDir = pathx.norm(path.join(pkgDir, "dist"));
  const distPrefix = distDir + path.sep;
  // Nested structure prefix for this package: dist/{pkgName}/src/
  const ownNestedPrefix = pathx.norm(path.join(distDir, pkgName, "src")) + path.sep;

  return (fileName, content) => {
    fileName = pathx.norm(fileName);

    if (!fileName.startsWith(distPrefix)) return null;

    if (fileName.startsWith(ownNestedPrefix)) {
      // Rewrite nested path to flat: dist/{pkgName}/src/... → dist/...
      const flatPath = path.join(distDir, fileName.slice(ownNestedPrefix.length));
      if (fileName.endsWith(".d.ts.map") || fileName.endsWith(".js.map")) {
        content = adjustMapSources(content, path.dirname(fileName), path.dirname(flatPath));
      }
      return [flatPath, content];
    }

    // Nested output from other packages (dist/{otherPkg}/src/...) → ignore
    const relFromDist = fileName.slice(distPrefix.length);
    const segments = relFromDist.split(path.sep);
    if (segments.length >= 3 && segments[1] === "src") {
      return null;
    }

    // Already flat structure (package with no dependencies) → output as is
    return [fileName, content];
  };
}
