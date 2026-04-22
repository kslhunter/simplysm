import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import { fsx, pathx } from "@simplysm/core-node";
import { env, SdError } from "@simplysm/core-common";
import { consola } from "consola";

//#region Types

/**
 * ESLint 실행 옵션
 */
export interface LintOptions {
  /** 린트 대상 경로 필터 (예: `packages/core-common`). 빈 배열이면 전체 대상 */
  targets: string[];
  /** 자동 수정 활성화 */
  fix: boolean;
  /** ESLint 규칙별 실행 시간 측정 활성화 (TIMING 환경변수 설정) */
  timing: boolean;
}

/**
 * executeLint()의 반환 타입
 */
export interface LintResult {
  /** 린트 에러가 없으면 true */
  success: boolean;
  /** ESLint 전체 에러 수 */
  errorCount: number;
  /** ESLint 전체 경고 수 */
  warningCount: number;
  /** 포매터 출력 문자열 (stdout에 출력할 내용) */
  formattedOutput: string;
}

//#endregion

//#region Utilities

/** ESLint 설정 파일 검색 순서 */
const ESLINT_CONFIG_FILES = [
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.js",
  "eslint.config.mjs",
] as const;

/**
 * ESLint 설정 객체가 ignores 속성만 가지고 있는지 확인하는 타입 가드
 */
function isGlobalIgnoresConfig(item: unknown): item is { ignores: string[] } {
  if (item == null || typeof item !== "object") return false;
  if (!("ignores" in item)) return false;
  if ("files" in item) return false; // files가 있으면 globalIgnores가 아님
  const ignores = item.ignores;
  if (!Array.isArray(ignores)) return false;
  return ignores.every((i) => typeof i === "string");
}

/**
 * eslint.config.ts/js에서 globalIgnores 패턴을 추출한다.
 * ignores만 있고 files가 없는 설정 객체가 globalIgnores이다.
 * @internal 테스트용으로 export
 */
export async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  let configPath: string | undefined;
  for (const f of ESLINT_CONFIG_FILES) {
    const p = path.join(cwd, f);
    if (await fsx.exists(p)) {
      configPath = p;
      break;
    }
  }

  if (configPath == null) {
    throw new SdError(
      `ESLint 설정 파일을 찾을 수 없습니다 (cwd: ${cwd}): ${ESLINT_CONFIG_FILES.join(", ")}`,
    );
  }

  const jiti = createJiti(import.meta.url);
  const configModule = await jiti.import<{ default: Record<string, unknown>[] } | undefined>(
    configPath,
  );

  let configs: unknown;
  if (Array.isArray(configModule)) {
    configs = configModule;
  } else if (
    configModule != null &&
    typeof configModule === "object" &&
    "default" in configModule
  ) {
    configs = configModule.default;
  } else {
    throw new SdError(`ESLint 설정 파일의 형식이 올바르지 않습니다: ${configPath}`);
  }

  if (!Array.isArray(configs)) {
    throw new SdError(`ESLint 설정이 배열이 아닙니다: ${configPath}`);
  }

  return configs.filter(isGlobalIgnoresConfig).flatMap((item) => item.ignores);
}

//#endregion

//#region Main

/**
 * ESLint를 실행하고 결과를 반환한다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - consola를 사용하여 진행 상황 표시
 * - stdout 출력이나 process.exitCode 설정 없음 (호출자가 결정)
 *
 * @param options - 린트 실행 옵션
 * @returns 린트 결과 (성공 여부, 에러/경고 수, 포매터 출력)
 */
export async function executeLint(options: LintOptions): Promise<LintResult> {
  const { targets, fix, timing } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:lint");

  logger.debug("린트 시작", { targets, fix, timing });

  // TIMING 환경변수 설정
  if (timing) {
    env("TIMING", "1");
  }

  // ESLint 설정 로드
  logger.debug("ESLint 설정 로딩 중");
  const ignorePatterns = await loadIgnorePatterns(cwd);
  logger.debug("무시 패턴 로드 완료", { ignorePatternCount: ignorePatterns.length });
  logger.debug(`ESLint 설정 로드 완료 (${ignorePatterns.length}개 무시 패턴)`);

  // 린트 대상 파일 수집
  logger.debug("린트 대상 파일 수집 중");
  let files = await fsx.glob("**/*.{ts,js,mjs,cjs}", {
    cwd,
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });
  files = pathx.filterByTargets(files, targets, cwd);
  logger.debug("파일 수집 완료", { fileCount: files.length });
  logger.debug(`린트 대상 파일 수집 완료 (${files.length}개 파일)`);

  // 린트 실행
  let eslint: ESLint | undefined;
  let eslintResults: ESLint.LintResult[] | undefined;
  if (files.length > 0) {
    logger.debug(`린트 실행 중... (${files.length}개 파일)`);
    eslint = new ESLint({
      cwd,
      fix,
    });
    eslintResults = await eslint.lintFiles(files);
    logger.debug("린트 실행 완료");

    // 자동 수정 적용
    if (fix) {
      logger.debug("자동 수정 적용 중...");
      await ESLint.outputFixes(eslintResults);
      logger.debug("자동 수정 적용 완료");
    }
  }

  // 파일이 없거나 린트가 실행되지 않은 경우 성공 결과 반환
  if (files.length === 0 || eslintResults == null || eslint == null) {
    logger.info("린트할 파일 없음");
    return { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" };
  }

  // 결과 집계
  let errorCount = eslintResults.sum((r) => r.errorCount);
  let warningCount = eslintResults.sum((r) => r.warningCount);

  if (errorCount > 0) {
    logger.error("린트 에러 발생", { errorCount, warningCount });
  } else {
    logger.success("린트 완료", { errorCount, warningCount });
  }

  // 포매터 출력 수집
  let formattedOutput = "";
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(eslintResults);
  if (resultText) {
    formattedOutput += resultText;
  }

  return {
    success: errorCount === 0,
    errorCount,
    warningCount,
    formattedOutput,
  };
}

//#endregion
