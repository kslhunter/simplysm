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
 * package.json devDependencies에서 @types/* 패키지명을 추출한다.
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
 * 지정된 타입체크 환경에 맞게 compilerOptions를 조정한다.
 *
 * - node 환경: 브라우저 관련 lib(dom, webworker 패턴)을 제거한다. types는 변경 없음.
 * - browser 환경: lib은 변경 없음. types를 devDeps에서 "node"를 제외하고 명시적으로 설정한다.
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
 * 패키지 target을 타입체크 환경으로 매핑한다.
 * - server → ["node"], client → ["browser"]
 * - node → ["node"], browser → ["browser"]
 * - neutral/undefined → 이중 타입체크 (["node", "browser"]).
 */
export function toTypecheckEnvs(target: string | undefined): TypecheckEnv[] {
  if (target === "node" || target === "server") return ["node"];
  if (target === "browser" || target === "client") return ["browser"];
  return ["node", "browser"];
}

//#endregion

/**
 * 지정된 디렉토리에서 tsconfig.json을 파싱한다.
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
 * 패키지에서 소스 파일(src/ 하위)을 파싱된 tsconfig 기준으로 필터링하여 반환한다.
 * includeFixtures 옵션 사용 시 *.fixture.ts 파일도 포함한다.
 */
export function getPackageSourceFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  const srcDir = path.join(pkgDir, "src");
  const files = parsedConfig.fileNames.filter((f) => {
    if (pathx.isChildPath(f, srcDir)) return true;
    if (f.endsWith(".fixture.ts")) return true;
    return false;
  });
  logger.debug(`소스 파일 필터링: ${parsedConfig.fileNames.length}개 중 ${files.length}개 (src/ + fixtures)`);
  return files;
}

/**
 * 패키지의 모든 파일(src + tests)을 파싱된 tsconfig 기준으로 필터링하여 반환한다.
 */
export function getPackageFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  return parsedConfig.fileNames.filter((f) => pathx.isChildPath(f, pkgDir));
}
