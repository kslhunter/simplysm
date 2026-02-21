import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import { fsExists, fsGlob, pathFilterByTargets } from "@simplysm/core-node";
import "@simplysm/core-common";
import { SdError } from "@simplysm/core-common";
import { consola } from "consola";
import stylelint from "stylelint";

//#region Types

/**
 * ESLint 실행 옵션
 */
export interface LintOptions {
  /** 린트할 경로 필터 (예: `packages/core-common`). 빈 배열이면 전체 대상 */
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
  /** ESLint + Stylelint 에러 합계 */
  errorCount: number;
  /** ESLint + Stylelint 경고 합계 */
  warningCount: number;
  /** 포맷터 출력 문자열 (stdout에 쓸 내용) */
  formattedOutput: string;
}

//#endregion

//#region Utilities

/** ESLint 설정 파일 탐색 순서 */
const ESLINT_CONFIG_FILES = [
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.js",
  "eslint.config.mjs",
] as const;

/** Stylelint 설정 파일 탐색 순서 */
const STYLELINT_CONFIG_FILES = [
  "stylelint.config.ts",
  "stylelint.config.mts",
  "stylelint.config.js",
  "stylelint.config.mjs",
  ".stylelintrc.json",
  ".stylelintrc.yml",
] as const;

/**
 * ignores 속성만 가진 ESLint 설정 객체인지 검사하는 타입 가드
 */
function isGlobalIgnoresConfig(item: unknown): item is { ignores: string[] } {
  if (item == null || typeof item !== "object") return false;
  if (!("ignores" in item)) return false;
  if ("files" in item) return false; // files가 있으면 globalIgnores가 아님
  const ignores = (item as { ignores: unknown }).ignores;
  if (!Array.isArray(ignores)) return false;
  return ignores.every((i) => typeof i === "string");
}

/**
 * eslint.config.ts/js에서 globalIgnores 패턴을 추출한다.
 * files 속성 없이 ignores만 있는 설정 객체가 globalIgnores이다.
 * @internal 테스트용으로 export
 */
export async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  let configPath: string | undefined;
  for (const f of ESLINT_CONFIG_FILES) {
    const p = path.join(cwd, f);
    if (await fsExists(p)) {
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
    throw new SdError(`ESLint 설정 파일이 올바른 형식이 아닙니다: ${configPath}`);
  }

  if (!Array.isArray(configs)) {
    throw new SdError(`ESLint 설정이 배열이 아닙니다: ${configPath}`);
  }

  return configs.filter(isGlobalIgnoresConfig).flatMap((item) => item.ignores);
}

/**
 * Stylelint 설정 파일이 존재하는지 확인한다.
 */
async function hasStylelintConfig(cwd: string): Promise<boolean> {
  for (const f of STYLELINT_CONFIG_FILES) {
    if (await fsExists(path.join(cwd, f))) return true;
  }
  return false;
}

//#endregion

//#region Main

/**
 * ESLint/Stylelint를 실행하고 결과를 반환한다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - consola를 사용하여 진행 상황 표시
 * - 캐시 활성화 (`.cache/eslint.cache`에 저장, 설정 변경 시 자동 무효화)
 * - stdout 출력이나 process.exitCode 설정은 하지 않음 (호출자가 판단)
 *
 * @param options - 린트 실행 옵션
 * @returns 린트 결과 (성공 여부, 에러/경고 수, 포맷터 출력)
 */
export async function executeLint(options: LintOptions): Promise<LintResult> {
  const { targets, fix, timing } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:lint");

  logger.debug("린트 시작", { targets, fix, timing });

  // TIMING 환경변수 설정
  if (timing) {
    process.env["TIMING"] = "1";
  }

  // ESLint 설정 로드
  logger.start("ESLint 설정 로드");
  const ignorePatterns = await loadIgnorePatterns(cwd);
  logger.debug("ignore 패턴 로드 완료", { ignorePatternCount: ignorePatterns.length });
  logger.success(`ESLint 설정 로드 (${ignorePatterns.length}개 ignore 패턴)`);

  // 린트 대상 파일 수집
  logger.start("린트 대상 파일 수집");
  let files = await fsGlob("**/*.{ts,tsx,js,jsx}", {
    cwd,
    ignore: ignorePatterns,
    nodir: true,
    absolute: true,
  });
  files = pathFilterByTargets(files, targets, cwd);
  logger.debug("파일 수집 완료", { fileCount: files.length });
  logger.success(`린트 대상 파일 수집 (${files.length}개)`);

  // 린트 실행
  let eslint: ESLint | undefined;
  let eslintResults: ESLint.LintResult[] | undefined;
  if (files.length > 0) {
    logger.start(`린트 실행 중... (${files.length}개 파일)`);
    eslint = new ESLint({
      cwd,
      fix,
      cache: true,
      cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
    });
    eslintResults = await eslint.lintFiles(files);
    logger.success("린트 실행 완료");

    // 자동 수정 적용
    if (fix) {
      logger.debug("자동 수정 적용 중...");
      await ESLint.outputFixes(eslintResults);
      logger.debug("자동 수정 적용 완료");
    }
  }

  // Stylelint
  const hasStylelintCfg = await hasStylelintConfig(cwd);
  let stylelintResult: stylelint.LinterResult | undefined;
  if (hasStylelintCfg) {
    logger.start("CSS 파일 수집");
    let cssFiles = await fsGlob("**/*.css", {
      cwd,
      ignore: ignorePatterns,
      nodir: true,
      absolute: true,
    });
    cssFiles = pathFilterByTargets(cssFiles, targets, cwd);
    logger.success(`CSS 파일 수집 (${cssFiles.length}개)`);

    if (cssFiles.length > 0) {
      logger.start(`Stylelint 실행 중... (${cssFiles.length}개 파일)`);
      let configFile: string | undefined;
      for (const f of STYLELINT_CONFIG_FILES) {
        const configPath = path.join(cwd, f);
        if (await fsExists(configPath)) {
          configFile = configPath;
          break;
        }
      }

      // TypeScript 설정 파일 지원: jiti로 로드 후 config 객체로 전달
      let stylelintOptions: stylelint.LinterOptions;
      if (configFile != null && /\.ts$/.test(configFile)) {
        const jiti = createJiti(import.meta.url);
        const configModule = await jiti.import<{ default: stylelint.Config }>(configFile);
        const config = configModule.default;
        stylelintOptions = {
          files: cssFiles,
          config,
          configBasedir: cwd,
          fix,
          cache: true,
          cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
        };
      } else {
        stylelintOptions = {
          files: cssFiles,
          configFile,
          fix,
          cache: true,
          cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
        };
      }
      stylelintResult = await stylelint.lint(stylelintOptions);
      logger.success("Stylelint 실행 완료");
    }
  }

  // 파일이 없거나 린트가 실행되지 않았으면 성공 결과 반환
  if (files.length === 0 || eslintResults == null || eslint == null) {
    logger.info("린트할 파일 없음");
    return { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" };
  }

  // 결과 집계
  let errorCount = eslintResults.sum((r) => r.errorCount);
  let warningCount = eslintResults.sum((r) => r.warningCount);

  if (errorCount > 0) {
    logger.error("린트 에러 발생", { errorCount, warningCount });
  } else if (warningCount > 0) {
    logger.info("린트 완료 (경고 있음)", { errorCount, warningCount });
  } else {
    logger.info("린트 완료", { errorCount, warningCount });
  }

  // 포맷터 출력 수집
  let formattedOutput = "";
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(eslintResults);
  if (resultText) {
    formattedOutput += resultText;
  }

  // Stylelint 결과 수집
  if (stylelintResult != null && stylelintResult.results.length > 0) {
    const stylelintErrorCount = stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "error").length,
    );
    const stylelintWarningCount = stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "warning").length,
    );

    errorCount += stylelintErrorCount;
    warningCount += stylelintWarningCount;

    if (stylelintErrorCount > 0) {
      logger.error("Stylelint 에러 발생", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    } else if (stylelintWarningCount > 0) {
      logger.info("Stylelint 완료 (경고 있음)", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    } else {
      logger.info("Stylelint 완료", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    }

    // Stylelint formatter 출력
    const stylelintFormatter = await stylelint.formatters.string;
    const stylelintOutput = stylelintFormatter(stylelintResult.results, stylelintResult);
    if (stylelintOutput) {
      formattedOutput += stylelintOutput;
    }
  }

  return {
    success: errorCount === 0,
    errorCount,
    warningCount,
    formattedOutput,
  };
}

/**
 * ESLint를 실행한다.
 *
 * executeLint()를 호출하고 결과를 stdout에 출력한 뒤 exitCode를 설정하는 래퍼.
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runLint(options: LintOptions): Promise<void> {
  const result = await executeLint(options);
  if (result.formattedOutput) {
    process.stdout.write(result.formattedOutput);
  }
  if (!result.success) {
    process.exitCode = 1;
  }
}

//#endregion
