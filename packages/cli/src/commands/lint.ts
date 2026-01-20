import { ESLint } from "eslint";
import { createJiti } from "jiti";
import path from "path";
import { FsUtils, PathUtils } from "@simplysm/core-node";
import { createCliContext } from "../utils/cli-context";

/**
 * 환경변수를 설정하고 using 문으로 자동 복원하는 Disposable을 반환합니다.
 */
function setEnvVar(key: string, value: string): Disposable {
  const original = process.env[key];
  process.env[key] = value;
  return {
    [Symbol.dispose]() {
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    },
  };
}

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

/**
 * eslint.config.ts/js에서 globalIgnores 패턴을 추출합니다.
 * files 속성 없이 ignores만 있는 설정 객체가 globalIgnores입니다.
 * @internal 테스트용으로 export
 */
export async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  const configFiles = [
    "eslint.config.ts",
    "eslint.config.mts",
    "eslint.config.js",
    "eslint.config.mjs",
  ];

  let configPath: string | undefined;
  for (const file of configFiles) {
    const fullPath = path.join(cwd, file);
    if (FsUtils.exists(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (configPath == null) {
    throw new Error(
      `ESLint 설정 파일을 찾을 수 없습니다: ${configFiles.join(", ")}`
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
    throw new Error(`ESLint 설정 파일이 올바른 형식이 아닙니다: ${configPath}`);
  }

  if (!Array.isArray(configs)) {
    throw new Error(`ESLint 설정이 배열이 아닙니다: ${configPath}`);
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
 * ESLint를 실행합니다.
 *
 * - `eslint.config.ts/js`에서 globalIgnores 패턴을 추출하여 glob 필터링에 적용
 * - 캐시가 기본 활성화되어 `.cache/eslint.cache`에 저장
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 린트 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runLint(options: LintOptions): Promise<void> {
  const { targets, fix, timing, debug } = options;
  const cwd = process.cwd();

  // 로거/스피너 설정
  const { logger, spinner } = createCliContext("sd-cli:lint", debug, "린트 준비 중...");

  try {
    logger.debug({ targets, fix, timing }, "린트 시작");

    // TIMING 환경변수 설정 (using 문으로 함수 종료 시 자동 복원)
    using _timing = timing ? setEnvVar("TIMING", "1") : undefined;

    // eslint.config.ts/js에서 ignore 패턴 로드
    if (spinner) spinner.text = "ESLint 설정 로드 중...";
    let ignorePatterns: string[];
    try {
      ignorePatterns = await loadIgnorePatterns(cwd);
    } catch (err) {
      spinner?.fail("ESLint 설정 로드 실패");
      logger.error({ err }, "ESLint 설정 로드 실패");
      if (err instanceof Error) {
        process.stderr.write(err.message + "\n");
      }
      process.exitCode = 1;
      return;
    }
    logger.debug({ ignorePatternCount: ignorePatterns.length }, "ignore 패턴 로드 완료");

    // glob으로 파일 목록 생성 (ignore 적용)
    if (spinner) spinner.text = "린트 대상 파일 수집 중...";
    let files = await FsUtils.globAsync("**/*.{ts,js,html}", {
      cwd,
      ignore: ignorePatterns,
      nodir: true,
      absolute: true,
    });

    // targets가 주어지면 해당 경로의 하위 파일만 필터링
    files = PathUtils.filterByTargets(files, targets, cwd);
    logger.debug({ fileCount: files.length }, "파일 수집 완료");

    if (files.length === 0) {
      spinner?.succeed("린트할 파일이 없습니다.");
      logger.info("린트할 파일 없음");
      return;
    }

    // ESLint 실행 (캐시 활성화)
    if (spinner) spinner.text = `린트 실행 중... (${files.length}개 파일)`;
    const eslint = new ESLint({
      cwd,
      fix,
      cache: true,
      cacheLocation: path.join(cwd, ".cache", "eslint.cache"),
    });
    const results = await eslint.lintFiles(files);

    if (fix) {
      if (spinner) spinner.text = "자동 수정 적용 중...";
      await ESLint.outputFixes(results);
      logger.debug("자동 수정 적용 완료");
    }

    // 결과 집계
    const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warningCount, 0);

    if (errorCount > 0) {
      spinner?.fail(`린트 에러 발견 (${errorCount}개 에러, ${warningCount}개 경고)`);
      logger.error({ errorCount, warningCount }, "린트 에러 발생");
    } else if (warningCount > 0) {
      spinner?.warn(`린트 완료 (${warningCount}개 경고)`);
      logger.info({ errorCount, warningCount }, "린트 완료 (경고 있음)");
    } else {
      spinner?.succeed("린트 완료");
      logger.info({ errorCount, warningCount }, "린트 완료");
    }

    // 포맷터 출력
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = await formatter.format(results);
    process.stdout.write(resultText);

    // 에러 있으면 exit code 1
    if (errorCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    spinner?.stop();
  }
}
