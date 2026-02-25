import fs from "fs";
import path from "path";

const jsExtensions = [".js", ".cjs", ".mjs"];

const jsResolutionOrder = ["", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"];
const tsResolutionOrder = ["", ".ts", ".cts", ".mts", ".tsx", ".js", ".cjs", ".mjs", ".jsx"];

function resolveWithExtension(file: string, extensions: string[]): string | null {
  for (const ext of extensions) {
    const full = `${file}${ext}`;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  for (const ext of extensions) {
    const full = `${file}/index${ext}`;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

function resolvePackageFile(specifier: string, fromDir: string): string | null {
  const parts = specifier.split("/");
  const pkgName = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  const subPath = specifier.startsWith("@") ? parts.slice(2).join("/") : parts.slice(1).join("/");

  let searchDir = fromDir;
  while (true) {
    const candidate = path.join(searchDir, "node_modules", pkgName);
    if (fs.existsSync(candidate)) {
      const realDir = fs.realpathSync(candidate);
      if (subPath) {
        return resolveWithExtension(path.join(realDir, subPath), tsResolutionOrder);
      }
      return resolveWithExtension(path.join(realDir, "index"), tsResolutionOrder);
    }
    const parent = path.dirname(searchDir);
    if (parent === searchDir) break;
    searchDir = parent;
  }
  return null;
}

/**
 * Recursively collect dependencies of Tailwind config file
 *
 * Tailwind built-in `getModuleDependencies` only tracks relative path imports,
 * but this function also resolves `node_modules` symlinks to track actual files for packages in specified scope.
 */
export function getTailwindConfigDeps(configPath: string, replaceDeps: string[]): string[] {
  const seen = new Set<string>();

  function isReplaceDepImport(specifier: string): boolean {
    return replaceDeps.some((dep) => specifier === dep || specifier.startsWith(dep + "/"));
  }

  function walk(absoluteFile: string): void {
    if (seen.has(absoluteFile)) return;
    if (!fs.existsSync(absoluteFile)) return;
    seen.add(absoluteFile);

    const base = path.dirname(absoluteFile);
    const ext = path.extname(absoluteFile);
    const extensions = jsExtensions.includes(ext) ? jsResolutionOrder : tsResolutionOrder;

    let contents: string;
    try {
      contents = fs.readFileSync(absoluteFile, "utf-8");
    } catch {
      return;
    }

    for (const match of [
      ...contents.matchAll(/import[\s\S]*?['"](.{3,}?)['"]/gi),
      ...contents.matchAll(/import[\s\S]*from[\s\S]*?['"](.{3,}?)['"]/gi),
      ...contents.matchAll(/require\(['"`](.+)['"`]\)/gi),
    ]) {
      const specifier = match[1];
      let resolved: string | null = null;

      if (specifier.startsWith(".")) {
        resolved = resolveWithExtension(path.resolve(base, specifier), extensions);
      } else if (isReplaceDepImport(specifier)) {
        resolved = resolvePackageFile(specifier, base);
      }

      if (resolved != null) {
        walk(resolved);
      }
    }
  }

  walk(path.resolve(configPath));
  return [...seen];
}
