import ts from "typescript";
import path from "path";
import { fsExists, fsReadJson, pathIsChildPath } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";

/**
 * DOM-related lib patterns - libs that include browser APIs
 * Used when filtering libs that should be excluded from node environment (lib.dom.d.ts, lib.webworker.d.ts, etc)
 */
const DOM_LIB_PATTERNS = ["dom", "webworker"] as const;

/**
 * Read @types/* devDependencies from package.json and return types list
 */
export async function getTypesFromPackageJson(packageDir: string): Promise<string[]> {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!(await fsExists(packageJsonPath))) {
    return [];
  }

  const packageJson = await fsReadJson<{ devDependencies?: Record<string, string> }>(
    packageJsonPath,
  );
  const devDeps = packageJson.devDependencies ?? {};

  return Object.keys(devDeps)
    .filter((dep) => dep.startsWith("@types/"))
    .map((dep) => dep.replace("@types/", ""));
}

/**
 * Type check environment
 * - node: remove DOM lib + add node types
 * - browser: remove node types
 * - neutral: keep DOM lib + add node types (for Node/browser shared packages)
 */
export type TypecheckEnv = "node" | "browser" | "neutral";

/**
 * Create compiler options for package
 *
 * @param baseOptions - Compiler options from root tsconfig
 * @param env - Type check environment (node: remove DOM lib + add node types, browser: remove node types)
 * @param packageDir - Package directory path
 *
 * @remarks
 * The types option ignores baseOptions.types and is newly constructed per package.
 * This is because the global types in root tsconfig may not fit the package environment.
 * (e.g., prevent node types from being included in browser packages)
 */
export async function getCompilerOptionsForPackage(
  baseOptions: ts.CompilerOptions,
  env: TypecheckEnv,
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions };
  const packageTypes = await getTypesFromPackageJson(packageDir);

  // pnpm environment: search both package-specific node_modules/@types and root node_modules/@types
  options.typeRoots = [
    path.join(packageDir, "node_modules", "@types"),
    path.join(process.cwd(), "node_modules", "@types"),
  ];

  switch (env) {
    case "node":
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = [...new Set([...packageTypes, "node"])];
      break;
    case "browser":
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    case "neutral":
      options.types = [...new Set([...packageTypes, "node"])];
      break;
  }

  return options;
}

/**
 * Parse root tsconfig
 * @throws If unable to read or parse tsconfig.json
 */
export function parseRootTsconfig(cwd: string): ts.ParsedCommandLine {
  const tsconfigPath = path.join(cwd, "tsconfig.json");
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
    throw new SdError(`Failed to read tsconfig.json: ${message}`);
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd);

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"));
    throw new SdError(`Failed to parse tsconfig.json: ${messages.join("; ")}`);
  }

  return parsed;
}

/**
 * Get list of package source files (based on tsconfig)
 */
export function getPackageSourceFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  const pkgSrcDir = path.join(pkgDir, "src");
  return parsedConfig.fileNames.filter((f) => pathIsChildPath(f, pkgSrcDir));
}

/**
 * Get full list of package files (including src + tests)
 */
export function getPackageFiles(pkgDir: string, parsedConfig: ts.ParsedCommandLine): string[] {
  return parsedConfig.fileNames.filter((f) => {
    if (!pathIsChildPath(f, pkgDir)) return false;
    // Exclude files directly in package root (config files) — treated same as project root files in other tasks
    const relative = path.relative(pkgDir, f);
    return path.dirname(relative) !== ".";
  });
}
