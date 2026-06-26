import path from "path";
import ts from "typescript";
import { fsx, pathx } from "@simplysm/core-node";
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("sd:cli:tsconfig");

//#region TypecheckEnv

export type TypecheckEnv = "node" | "browser";

const DOM_LIB_PATTERNS = ["dom", "webworker"] as const;

/**
 * package.json devDependencies에서 @types/* 패키지명을 추출한다.
 */
export function getTypesFromPackageJson(packageDir: string): string[] {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!fsx.existsSync(packageJsonPath)) {
    return [];
  }
  try {
    const content = fsx.readSync(packageJsonPath);
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
 * - node 환경: 브라우저 관련 lib(dom, webworker 패턴)을 제거한다. types는 devDeps의 @types/*를 명시 설정한다(TS6 types=[] 기본값 대응, typecheck 경로용).
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
      options.types = getTypesFromPackageJson(packageDir);
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
    return false;
  });
  logger.debug(`소스 파일 필터링: ${parsedConfig.fileNames.length}개 중 ${files.length}개 (src/ only)`);
  return files;
}

/**
 * 패키지의 모든 파일(src + tests)을 파싱된 tsconfig 기준으로 필터링하여 반환한다.
 *
 * 단, 패키지 하위에 자체 tsconfig.json을 가진 디렉토리(예: SSG fixture, Angular 빌드 fixture)는
 * 별도 컴파일 단위이므로 rootNames에서 제외한다. 그렇지 않으면 부모 패키지의 컴파일 환경
 * (예: node env로 인한 DOM lib 제거)으로 fixture가 타입체크되어 잘못된 에러가 발생한다.
 */
export function getPackageFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  const pkgDirResolved = pathx.posixResolve(pkgDir);
  const nestedProjectCache = new Map<string, boolean>();

  // 디렉토리가 패키지 하위의 중첩 tsconfig 프로젝트(자체 tsconfig.json 보유)에 속하는지 판정한다.
  const isInNestedProject = (dir: string): boolean => {
    const resolved = pathx.posixResolve(dir);
    if (resolved === pkgDirResolved) return false;
    if (!pathx.isChildPath(dir, pkgDir)) return false;
    const cached = nestedProjectCache.get(resolved);
    if (cached != null) return cached;
    const hasOwnTsconfig = fsx.existsSync(path.join(dir, "tsconfig.json"));
    const result = hasOwnTsconfig || isInNestedProject(path.dirname(dir));
    nestedProjectCache.set(resolved, result);
    return result;
  };

  const files = parsedConfig.fileNames.filter(
    (f) => pathx.isChildPath(f, pkgDir) && !isInNestedProject(path.dirname(f)),
  );
  logger.debug(
    `패키지 파일 필터링: ${parsedConfig.fileNames.length}개 중 ${files.length}개 (중첩 tsconfig 디렉토리 제외)`,
  );
  return files;
}
