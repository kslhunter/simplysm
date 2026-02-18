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
  const configModule = await jiti.import(configPath);

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
 * ESLint를 실행한다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - consola를 사용하여 진행 상황 표시
 * - 캐시 활성화 (`.cache/eslint.cache`에 저장, 설정 변경 시 자동 무효화)
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runLint(options: LintOptions): Promise<void> {
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
      stylelintResult = await stylelint.lint({
        files: cssFiles,
        configFile,
        fix,
        cache: true,
        cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
      });
      logger.success("Stylelint 실행 완료");
    }
  }

  // 파일이 없거나 린트가 실행되지 않았으면 조기 종료
  if (files.length === 0 || eslintResults == null || eslint == null) {
    logger.info("린트할 파일 없음");
    return;
  }

  // 결과 집계
  const errorCount = eslintResults.sum((r) => r.errorCount);
  const warningCount = eslintResults.sum((r) => r.warningCount);

  if (errorCount > 0) {
    logger.error("린트 에러 발생", { errorCount, warningCount });
  } else if (warningCount > 0) {
    logger.info("린트 완료 (경고 있음)", { errorCount, warningCount });
  } else {
    logger.info("린트 완료", { errorCount, warningCount });
  }

  // 포맷터 출력
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(eslintResults);
  if (resultText) {
    process.stdout.write(resultText);
  }

  // 에러 있으면 exit code 1
  if (errorCount > 0) {
    process.exitCode = 1;
  }

  // Stylelint 결과 출력
  if (stylelintResult != null && stylelintResult.results.length > 0) {
    const stylelintErrorCount = stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "error").length,
    );
    const stylelintWarningCount = stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "warning").length,
    );

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
      process.stdout.write(stylelintOutput);
    }

    if (stylelintErrorCount > 0) {
      process.exitCode = 1;
    }
  }
}

//#endregion
