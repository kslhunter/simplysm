import path from "path";
import fs from "fs";
import ts from "typescript";
import { pathx } from "@simplysm/core-node";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:tsconfig");

//#region TypecheckEnv

export type TypecheckEnv = "node" | "browser";

const DOM_LIB_PATTERNS = ["dom", "webworker"] as const;

/**
 * Extract @types/* package names from package.json devDependencies.
 */
export function getTypesFromPackageJson(packageDir: string): string[] {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson: { devDependencies?: Record<string, string> } = JSON.parse(content);
    const devDeps = packageJson.devDependencies ?? {};
    return Object.keys(devDeps)
      .filter((dep) => dep.startsWith("@types/"))
      .map((dep) => dep.replace("@types/", ""));
  } catch {
    return [];
  }
}

/**
 * Adjust compilerOptions for the given typecheck environment.
 *
 * - node env: remove browser-related libs (dom, webworker patterns). types unchanged.
 * - browser env: lib unchanged. types set explicitly from devDeps minus "node".
 */
export function getCompilerOptionsForEnv(
  baseOptions: ts.CompilerOptions,
  env: TypecheckEnv,
  packageDir: string,
): ts.CompilerOptions {
  const options = { ...baseOptions };

  switch (env) {
    case "node":
      if (options.lib != null) {
        options.lib = options.lib.filter(
          (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
        );
      }
      break;
    case "browser": {
      const packageTypes = getTypesFromPackageJson(packageDir);
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    }
  }

  return options;
}

/**
 * Map package target to typecheck environments.
 * neutral/undefined → dual typecheck (node + browser).
 */
export function toTypecheckEnvs(target: string | undefined): TypecheckEnv[] {
  if (target === "node" || target === "server") return ["node"];
  if (target === "browser" || target === "client") return ["browser"];
  return ["node", "browser"];
}

//#endregion

/**
 * Parse tsconfig.json from the given directory.
 */
export function parseTsconfig(dir: string): ts.ParsedCommandLine {
  const tsconfigPath = path.join(dir, "tsconfig.json");
  logger.debug(`tsconfig 파싱: ${tsconfigPath}`);
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    const msg = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
    logger.debug(`tsconfig 읽기 실패: ${msg}`);
    throw new Error(msg);
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dir);
  if (parsed.errors.length > 0) {
    const msg = parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("\n");
    logger.debug(`tsconfig 파싱 에러 (${parsed.errors.length}개): ${msg}`);
    throw new Error(msg);
  }
  logger.debug(`tsconfig 파싱 완료: ${parsed.fileNames.length}개 파일 발견`);
  return parsed;
}

/**
 * Get source files (under src/) from a package, filtered by the parsed tsconfig.
 */
export function getPackageSourceFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  const srcDir = path.join(pkgDir, "src");
  const files = parsedConfig.fileNames.filter((f) => pathx.isChildPath(f, srcDir));
  logger.debug(`소스 파일 필터링: ${parsedConfig.fileNames.length}개 중 ${files.length}개 (src/ 하위)`);
  return files;
}

/**
 * Get all files (src + tests) from a package, filtered by the parsed tsconfig.
 */
export function getPackageFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  return parsedConfig.fileNames.filter((f) => pathx.isChildPath(f, pkgDir));
}
