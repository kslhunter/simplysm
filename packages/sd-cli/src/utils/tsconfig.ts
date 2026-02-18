import ts from "typescript";
import path from "path";
import { fsExists, fsReadJson } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";

/**
 * DOM 관련 lib 패턴 - 브라우저 API를 포함하는 lib들
 * node 환경에서 제외되어야 하는 lib을 필터링할 때 사용 (lib.dom.d.ts, lib.webworker.d.ts 등)
 */
const DOM_LIB_PATTERNS = ["dom", "webworker"] as const;

/**
 * 패키지의 package.json에서 @types/* devDependencies를 읽어 types 목록을 반환합니다.
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
 * 타입체크 환경
 * - node: DOM lib 제거 + node 타입 추가
 * - browser: node 타입 제거
 * - neutral: DOM lib 유지 + node 타입 추가 (Node/브라우저 공용 패키지용)
 */
export type TypecheckEnv = "node" | "browser" | "neutral";

/**
 * 패키지용 컴파일러 옵션 생성
 *
 * @param baseOptions 루트 tsconfig의 컴파일러 옵션
 * @param env 타입체크 환경 (node: DOM lib 제거 + node 타입 추가, browser: node 타입 제거)
 * @param packageDir 패키지 디렉토리 경로
 *
 * @remarks
 * types 옵션은 baseOptions.types를 무시하고 패키지별로 새로 구성한다.
 * 이는 루트 tsconfig의 전역 타입이 패키지 환경에 맞지 않을 수 있기 때문이다.
 * (예: browser 패키지에 node 타입이 포함되는 것을 방지)
 */
export async function getCompilerOptionsForPackage(
  baseOptions: ts.CompilerOptions,
  env: TypecheckEnv,
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions };
  const packageTypes = await getTypesFromPackageJson(packageDir);

  // pnpm 환경: 패키지별 node_modules/@types와 루트 node_modules/@types 모두 검색
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
 * 루트 tsconfig 파싱
 * @throws tsconfig.json을 읽거나 파싱할 수 없는 경우
 */
export function parseRootTsconfig(cwd: string): ts.ParsedCommandLine {
  const tsconfigPath = path.join(cwd, "tsconfig.json");
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
    throw new SdError(`tsconfig.json 읽기 실패: ${message}`);
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd);

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"));
    throw new SdError(`tsconfig.json 파싱 실패: ${messages.join("; ")}`);
  }

  return parsed;
}

/**
 * 패키지의 소스 파일 목록 가져오기 (tsconfig 기반)
 */
export function getPackageSourceFiles(
  pkgDir: string,
  parsedConfig: ts.ParsedCommandLine,
): string[] {
  // 경로 구분자까지 포함하여 비교 (packages/core와 packages/core-common 구분)
  const pkgSrcPrefix = path.join(pkgDir, "src") + path.sep;
  return parsedConfig.fileNames.filter((f) => f.startsWith(pkgSrcPrefix));
}
