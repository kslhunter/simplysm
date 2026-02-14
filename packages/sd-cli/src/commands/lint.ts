import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import { Listr } from "listr2";
import { fsExists, fsGlob, pathFilterByTargets } from "@simplysm/core-node";
import "@simplysm/core-common";
import { SdError } from "@simplysm/core-common";
import { consola, LogLevels } from "consola";
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
 * Listr2 컨텍스트 타입
 */
interface LintContext {
  ignorePatterns: string[];
  /** 파일 수집 태스크 완료 후 초기화됨 */
  files?: string[];
  /** 린트 대상 파일이 있을 때만 초기화됨 */
  eslint?: ESLint;
  /** 린트 대상 파일이 있을 때만 초기화됨 */
  results?: ESLint.LintResult[];
  // Stylelint
  hasStylelintConfig?: boolean;
  cssFiles?: string[];
  stylelintResult?: stylelint.LinterResult;
}

//#endregion

//#region Utilities

/** ESLint 설정 파일 탐색 순서 */
const ESLINT_CONFIG_FILES = ["eslint.config.ts", "eslint.config.mts", "eslint.config.js", "eslint.config.mjs"] as const;

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
    throw new SdError(`ESLint 설정 파일을 찾을 수 없습니다 (cwd: ${cwd}): ${ESLINT_CONFIG_FILES.join(", ")}`);
  }

  const jiti = createJiti(import.meta.url);
  const configModule = await jiti.import(configPath);

  let configs: unknown;
  if (Array.isArray(configModule)) {
    configs = configModule;
  } else if (configModule != null && typeof configModule === "object" && "default" in configModule) {
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
 * - listr2를 사용하여 진행 상황 표시
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

  const listr = new Listr<LintContext, "default" | "verbose">(
    [
      {
        title: "ESLint 설정 로드",
        task: async (ctx, task) => {
          ctx.ignorePatterns = await loadIgnorePatterns(cwd);
          logger.debug("ignore 패턴 로드 완료", { ignorePatternCount: ctx.ignorePatterns.length });
          task.title = `ESLint 설정 로드 (${ctx.ignorePatterns.length}개 ignore 패턴)`;
        },
      },
      {
        title: "린트 대상 파일 수집",
        task: async (ctx, task) => {
          let files = await fsGlob("**/*.{ts,tsx,js,jsx}", {
            cwd,
            ignore: ctx.ignorePatterns,
            nodir: true,
            absolute: true,
          });

          // targets가 주어지면 해당 경로의 하위 파일만 필터링
          files = pathFilterByTargets(files, targets, cwd);
          ctx.files = files;
          logger.debug("파일 수집 완료", { fileCount: files.length });
          task.title = `린트 대상 파일 수집 (${files.length}개)`;

          if (files.length === 0) {
            task.skip("린트할 파일이 없습니다.");
          }
        },
      },
      {
        title: "린트 실행",
        enabled: (ctx) => (ctx.files?.length ?? 0) > 0,
        task: async (ctx, task) => {
          const files = ctx.files!;
          task.title = `린트 실행 중... (${files.length}개 파일)`;
          ctx.eslint = new ESLint({
            cwd,
            fix,
            cache: true,
            cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
          });
          ctx.results = await ctx.eslint.lintFiles(files);
        },
      },
      {
        title: "자동 수정 적용",
        enabled: () => fix,
        skip: (ctx) => (ctx.files?.length ?? 0) === 0 || ctx.results == null,
        task: async (ctx) => {
          if (ctx.results == null) return;
          await ESLint.outputFixes(ctx.results);
          logger.debug("자동 수정 적용 완료");
        },
      },
      {
        title: "Stylelint 설정 확인",
        task: async (ctx, task) => {
          ctx.hasStylelintConfig = await hasStylelintConfig(cwd);
          if (!ctx.hasStylelintConfig) {
            task.skip("stylelint.config 파일 없음");
          }
        },
      },
      {
        title: "CSS 파일 수집",
        enabled: (ctx) => ctx.hasStylelintConfig === true,
        task: async (ctx, task) => {
          let cssFiles = await fsGlob("**/*.css", {
            cwd,
            ignore: ctx.ignorePatterns,
            nodir: true,
            absolute: true,
          });
          cssFiles = pathFilterByTargets(cssFiles, targets, cwd);
          ctx.cssFiles = cssFiles;
          task.title = `CSS 파일 수집 (${cssFiles.length}개)`;
          if (cssFiles.length === 0) {
            task.skip("린트할 CSS 파일이 없습니다.");
          }
        },
      },
      {
        title: "Stylelint 실행",
        enabled: (ctx) => (ctx.cssFiles?.length ?? 0) > 0,
        task: async (ctx, task) => {
          const cssFiles = ctx.cssFiles!;
          task.title = `Stylelint 실행 중... (${cssFiles.length}개 파일)`;

          // Stylelint 설정 파일 경로 찾기
          let configFile: string | undefined;
          for (const f of STYLELINT_CONFIG_FILES) {
            const configPath = path.join(cwd, f);
            if (await fsExists(configPath)) {
              configFile = configPath;
              break;
            }
          }

          const result = await stylelint.lint({
            files: cssFiles,
            configFile,
            fix,
            cache: true,
            cacheLocation: path.join(cwd, ".cache", "stylelint.cache"),
          });
          ctx.stylelintResult = result;
        },
      },
    ],
    {
      renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
    },
  );

  const ctx = await listr.run();

  // 파일이 없거나 린트가 실행되지 않았으면 조기 종료
  if ((ctx.files?.length ?? 0) === 0 || ctx.results == null || ctx.eslint == null) {
    logger.info("린트할 파일 없음");
    return;
  }

  // 결과 집계
  const errorCount = ctx.results.sum((r) => r.errorCount);
  const warningCount = ctx.results.sum((r) => r.warningCount);

  if (errorCount > 0) {
    logger.error("린트 에러 발생", { errorCount, warningCount });
  } else if (warningCount > 0) {
    logger.info("린트 완료 (경고 있음)", { errorCount, warningCount });
  } else {
    logger.info("린트 완료", { errorCount, warningCount });
  }

  // 포맷터 출력
  const formatter = await ctx.eslint.loadFormatter("stylish");
  const resultText = await formatter.format(ctx.results);
  if (resultText) {
    process.stdout.write(resultText);
  }

  // 에러 있으면 exit code 1
  if (errorCount > 0) {
    process.exitCode = 1;
  }

  // Stylelint 결과 출력
  if (ctx.stylelintResult != null && ctx.stylelintResult.results.length > 0) {
    const stylelintErrorCount = ctx.stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "error").length,
    );
    const stylelintWarningCount = ctx.stylelintResult.results.sum(
      (r) => r.warnings.filter((w) => w.severity === "warning").length,
    );

    if (stylelintErrorCount > 0) {
      logger.error("Stylelint 에러 발생", { errorCount: stylelintErrorCount, warningCount: stylelintWarningCount });
    } else if (stylelintWarningCount > 0) {
      logger.info("Stylelint 완료 (경고 있음)", {
        errorCount: stylelintErrorCount,
        warningCount: stylelintWarningCount,
      });
    } else {
      logger.info("Stylelint 완료", { errorCount: stylelintErrorCount, warningCount: stylelintWarningCount });
    }

    // Stylelint formatter 출력
    const stylelintFormatter = await stylelint.formatters.string;
    const stylelintOutput = stylelintFormatter(ctx.stylelintResult.results, ctx.stylelintResult);
    if (stylelintOutput) {
      process.stdout.write(stylelintOutput);
    }

    if (stylelintErrorCount > 0) {
      process.exitCode = 1;
    }
  }
}

//#endregion
