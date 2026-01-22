import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import pino from "pino";
import { Listr } from "listr2";
import { FsUtils, PathUtils } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";

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
 * ESLint 실행 옵션
 */
export interface LintOptions {
  /** 린트할 경로 필터 (예: `packages/core-common`). 빈 배열이면 전체 대상 */
  targets: string[];
  /** 자동 수정 활성화 */
  fix: boolean;
  /** ESLint 규칙별 실행 시간 측정 활성화 (TIMING 환경변수 설정) */
  timing: boolean;
  /** debug 로그 출력 */
  debug: boolean;
}

/** ESLint 설정 파일 탐색 순서 */
const ESLINT_CONFIG_FILES = [
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.js",
  "eslint.config.mjs",
] as const;

/**
 * eslint.config.ts/js에서 globalIgnores 패턴을 추출한다.
 * files 속성 없이 ignores만 있는 설정 객체가 globalIgnores이다.
 * @internal 테스트용으로 export
 */
export async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  const configPath = ESLINT_CONFIG_FILES
    .map((f) => path.join(cwd, f))
    .find((p) => FsUtils.exists(p));

  if (configPath == null) {
    throw new SdError(
      `ESLint 설정 파일을 찾을 수 없습니다 (cwd: ${cwd}): ${ESLINT_CONFIG_FILES.join(", ")}`
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

  const ignores: string[] = [];
  for (const item of configs) {
    if (isGlobalIgnoresConfig(item)) {
      ignores.push(...item.ignores);
    }
  }

  return ignores;
}

/**
 * Listr2 컨텍스트 타입
 */
interface LintContext {
  ignorePatterns: string[];
  files: string[];
  results: ESLint.LintResult[];
}

/**
 * ESLint를 실행합니다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - listr2를 사용하여 진행 상황 표시
 * - 캐시가 기본 활성화되어 `.cache/eslint.cache`에 저장
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runLint(options: LintOptions): Promise<void> {
  const { targets, fix, timing, debug } = options;
  const cwd = process.cwd();

  // pino 로거 (debug 모드에서만 활성화)
  const logger = pino({
    name: "sd-cli:lint",
    level: debug ? "debug" : "silent",
    transport: debug ? { target: "pino-pretty" } : undefined,
  });

  logger.debug({ targets, fix, timing }, "린트 시작");

  // TIMING 환경변수 설정
  if (timing) {
    process.env["TIMING"] = "1";
  }

  const listr = new Listr<LintContext, "default" | "verbose">(
    [
      {
        title: "ESLint 설정 로드",
        task: async (ctx, task) => {
          try {
            ctx.ignorePatterns = await loadIgnorePatterns(cwd);
            logger.debug({ ignorePatternCount: ctx.ignorePatterns.length }, "ignore 패턴 로드 완료");
            task.title = `ESLint 설정 로드 (${ctx.ignorePatterns.length}개 ignore 패턴)`;
          } catch (err) {
            logger.error({ err }, "ESLint 설정 로드 실패");
            if (err instanceof Error) {
              process.stderr.write(err.message + "\n");
            }
            process.exitCode = 1;
            throw err;
          }
        },
      },
      {
        title: "린트 대상 파일 수집",
        task: async (ctx, task) => {
          let files = await FsUtils.globAsync("**/*.{ts,js,html}", {
            cwd,
            ignore: ctx.ignorePatterns,
            nodir: true,
            absolute: true,
          });

          // targets가 주어지면 해당 경로의 하위 파일만 필터링
          files = PathUtils.filterByTargets(files, targets, cwd);
          ctx.files = files;
          logger.debug({ fileCount: files.length }, "파일 수집 완료");
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
          task.title = `린트 실행 중... (${ctx.files.length}개 파일)`;
          const eslint = new ESLint({
            cwd,
            fix,
            cache: true,
            cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
          });
          ctx.results = await eslint.lintFiles(ctx.files);
        },
      },
      {
        title: "자동 수정 적용",
        enabled: () => fix,
        skip: (ctx) => (ctx.files?.length ?? 0) === 0,
        task: async (ctx) => {
          await ESLint.outputFixes(ctx.results);
          logger.debug("자동 수정 적용 완료");
        },
      },
    ],
    {
      renderer: (debug ? "verbose" : "default") as "default" | "verbose",
    },
  );

  const ctx = await listr.run();

  // 파일이 없으면 조기 종료
  if (ctx.files.length === 0) {
    logger.info("린트할 파일 없음");
    return;
  }

  // 결과 집계
  const errorCount = ctx.results.reduce((sum, r) => sum + r.errorCount, 0);
  const warningCount = ctx.results.reduce((sum, r) => sum + r.warningCount, 0);

  if (errorCount > 0) {
    logger.error({ errorCount, warningCount }, "린트 에러 발생");
  } else if (warningCount > 0) {
    logger.info({ errorCount, warningCount }, "린트 완료 (경고 있음)");
  } else {
    logger.info({ errorCount, warningCount }, "린트 완료");
  }

  // 포맷터 출력
  const eslint = new ESLint({ cwd });
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(ctx.results);
  if (resultText) {
    process.stdout.write(resultText);
  }

  // 에러 있으면 exit code 1
  if (errorCount > 0) {
    process.exitCode = 1;
  }
}
