import ts from "typescript";
import path from "path";
import os from "os";
import { createJiti } from "jiti";
import { Listr } from "listr2";
import pino from "pino";
import { FsUtils, PathUtils, SdWorker, type SdWorkerProxy } from "@simplysm/core-node";
import { SdError } from "@simplysm/core-common";
import type { SdConfig, Target } from "../sd-config.types";
import type {
  TypecheckTaskInfo,
  TypecheckResult,
  SerializedDiagnostic,
} from "../workers/typecheck.worker";
import type * as TypecheckWorkerModule from "../workers/typecheck.worker";

//#region Types

/**
 * TypeScript 타입체크 옵션
 */
export interface TypecheckOptions {
  /** 타입체크할 경로 필터 (예: `packages/core-common`). 빈 배열이면 tsconfig.json에 정의된 모든 파일 대상 */
  targets: string[];
  /** debug 로그 출력 */
  debug: boolean;
}

// 패키지 정보 (packages/* 하위 파일 분류용)
interface PackageInfo {
  name: string;
  dir: string;
  target: Target;
}

// 패키지 테스트 정보 (packages/*/tests/* 하위 파일 분류용)
interface PackageTestInfo {
  name: string;
  dir: string; // packages/{pkg}/tests
  packageDir: string; // packages/{pkg}
  target: Target; // 패키지 target
}

// 테스트 정보 (tests/* 하위 파일 분류용)
interface TestInfo {
  name: string;
  dir: string;
}

// 파일 분류 결과
interface ClassifiedFiles {
  byPackage: Map<string, { info: PackageInfo; files: string[] }>; // packages/*/src 등
  byPackageTests: Map<string, { info: PackageTestInfo; files: string[] }>; // packages/*/tests
  byTests: Map<string, { info: TestInfo; files: string[] }>; // tests/*
  root: string[]; // 루트 파일 - 원본 tsconfig 설정 그대로
}

//#endregion

//#region Utilities

/**
 * DOM 관련 lib 패턴 - 브라우저 API를 포함하는 lib들
 * (dom: Window/Document 등, webworker: DedicatedWorkerGlobalScope 등)
 */
const DOM_LIB_PATTERNS = ["dom", "webworker"] as const;

/**
 * 패키지의 package.json에서 @types/* devDependencies를 읽어 types 목록을 반환합니다.
 * @param packageDir - 패키지 디렉토리 경로
 * @internal 테스트용으로 export
 */
export async function getTypesFromPackageJson(packageDir: string): Promise<string[]> {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!FsUtils.exists(packageJsonPath)) {
    return [];
  }

  const packageJson = await FsUtils.readJsonAsync<{ devDependencies?: Record<string, string> }>(
    packageJsonPath,
  );
  const devDeps = packageJson.devDependencies ?? {};

  return Object.keys(devDeps)
    .filter((dep) => dep.startsWith("@types/"))
    .map((dep) => dep.replace("@types/", ""));
}

/**
 * 타겟과 패키지 정보를 기반으로 컴파일러 옵션을 생성합니다.
 * - lib: tsconfig.json 기반으로 타겟에 맞게 조정
 * - types: 패키지의 devDependencies @types/* 기반으로 구성
 * @internal 테스트용으로 export
 */
export async function getCompilerOptionsForPackage(
  baseOptions: ts.CompilerOptions,
  target: Target,
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions, noEmit: true };

  // 패키지의 @types/* devDeps에서 types 목록 구성
  const packageTypes = await getTypesFromPackageJson(packageDir);

  switch (target) {
    case "node":
      // libs에서 DOM 관련 제거, types에 node 포함
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = [...new Set([...packageTypes, "node"])];
      break;
    case "browser":
      // libs 그대로, types에서 node 제거
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    case "neutral":
      // libs에서 DOM 관련 제거, types에서 node 제거
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = packageTypes.filter((t) => t !== "node");
      break;
  }

  return options;
}

/**
 * 패키지 테스트용 컴파일러 옵션 생성
 * - browser: DOM 유지, node 제거
 * - node: DOM 제거, node 추가
 * - neutral: DOM 유지, node 추가 (둘 다)
 * @internal 테스트용으로 export
 */
export async function getCompilerOptionsForPackageTests(
  baseOptions: ts.CompilerOptions,
  target: Target,
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions, noEmit: true };
  const packageTypes = await getTypesFromPackageJson(packageDir);

  switch (target) {
    case "node":
      // DOM 제거, node 추가
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = [...new Set([...packageTypes, "node"])];
      break;
    case "browser":
      // DOM 유지, node 제거
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    case "neutral":
      // DOM 유지, node 추가 (둘 다)
      options.types = [...new Set([...packageTypes, "node"])];
      break;
  }

  return options;
}

/**
 * 파일을 패키지/테스트/루트로 분류합니다.
 * @internal 테스트용으로 export
 */
export function classifyFiles(fileNames: string[], cwd: string, config: SdConfig): ClassifiedFiles {
  const result: ClassifiedFiles = {
    byPackage: new Map(),
    byPackageTests: new Map(),
    byTests: new Map(),
    root: [],
  };

  for (const fileName of fileNames) {
    const relativePath = PathUtils.posix(path.relative(cwd, fileName));

    // packages/{pkg}/tests/... - 패키지 테스트 (먼저 체크)
    const packageTestMatch = relativePath.match(/^packages\/([^/]+)\/tests\//);
    if (packageTestMatch) {
      const pkgName = packageTestMatch[1];
      const info: PackageTestInfo = {
        name: pkgName,
        dir: path.resolve(cwd, "packages", pkgName, "tests"),
        packageDir: path.resolve(cwd, "packages", pkgName),
        target: config.packages[pkgName]?.target ?? "neutral",
      };
      result.byPackageTests.getOrCreate(pkgName, { info, files: [] }).files.push(fileName);
      continue;
    }

    // packages/{pkg}/... (src 등 나머지)
    const packageMatch = relativePath.match(/^packages\/([^/]+)\//);
    if (packageMatch) {
      const pkgName = packageMatch[1];
      const info: PackageInfo = {
        name: pkgName,
        dir: path.resolve(cwd, "packages", pkgName),
        target: config.packages[pkgName]?.target ?? "neutral",
      };
      result.byPackage.getOrCreate(pkgName, { info, files: [] }).files.push(fileName);
      continue;
    }

    // tests/{name}/...
    const testsMatch = relativePath.match(/^tests\/([^/]+)\//);
    if (testsMatch) {
      const testName = testsMatch[1];
      const info: TestInfo = {
        name: testName,
        dir: path.resolve(cwd, "tests", testName),
      };
      result.byTests.getOrCreate(testName, { info, files: [] }).files.push(fileName);
      continue;
    }

    // 루트 파일
    result.root.push(fileName);
  }

  return result;
}

/**
 * 분류된 파일들로부터 타입체크 작업 목록을 생성합니다.
 */
function createTypecheckTaskInfos(
  classified: ClassifiedFiles,
  cwd: string,
): TypecheckTaskInfo[] {
  const tasks: TypecheckTaskInfo[] = [];

  // packages/*
  for (const { info, files } of classified.byPackage.values()) {
    tasks.push({
      name: `패키지: ${info.name}`,
      category: "package",
      files,
      target: info.target,
      packageDir: info.dir,
      buildInfoPath: path.join(info.dir, ".cache", "typecheck.tsbuildinfo"),
    });
  }

  // packages/*/tests
  for (const { info, files } of classified.byPackageTests.values()) {
    tasks.push({
      name: `패키지 테스트: ${info.name}`,
      category: "packageTest",
      files,
      target: info.target,
      packageDir: info.packageDir,
      buildInfoPath: path.join(info.packageDir, ".cache", "typecheck-tests.tsbuildinfo"),
    });
  }

  // tests/*
  for (const { info, files } of classified.byTests.values()) {
    tasks.push({
      name: `통합 테스트: ${info.name}`,
      category: "test",
      files,
      target: "node", // tests는 항상 node
      packageDir: info.dir,
      buildInfoPath: path.join(info.dir, ".cache", "typecheck.tsbuildinfo"),
    });
  }

  // root
  if (classified.root.length > 0) {
    tasks.push({
      name: "프로젝트 루트",
      category: "root",
      files: classified.root,
      target: "neutral",
      packageDir: cwd,
      buildInfoPath: path.join(cwd, ".cache", "typecheck.tsbuildinfo"),
    });
  }

  return tasks;
}

/**
 * SerializedDiagnostic을 ts.Diagnostic으로 복원
 */
function deserializeDiagnostic(
  serialized: SerializedDiagnostic,
  _formatHost: ts.FormatDiagnosticsHost,
): ts.Diagnostic {
  return {
    category: serialized.category,
    code: serialized.code,
    messageText: serialized.messageText,
    file: serialized.file
      ? ts.createSourceFile(
          serialized.file.fileName,
          "",
          ts.ScriptTarget.Latest,
          false,
          ts.ScriptKind.TS,
        )
      : undefined,
    start: serialized.start,
    length: serialized.length,
  };
}

//#endregion

//#region Main

/**
 * TypeScript 타입체크를 실행합니다.
 *
 * - `tsconfig.json`을 로드하여 컴파일러 옵션 적용
 * - `sd.config.ts`를 로드하여 패키지별 타겟 정보 확인 (없으면 기본값 사용)
 * - Worker threads를 사용하여 실제 병렬 타입체크 수행
 * - incremental 컴파일 사용 (`.cache/typecheck.tsbuildinfo`)
 * - listr2를 사용하여 진행 상황 표시
 * - 에러 발생 시 `process.exitCode = 1` 설정
 *
 * @param options - 타입체크 실행 옵션
 * @returns 완료 시 resolve. 에러 발견 시 `process.exitCode`를 1로 설정하고 resolve (throw하지 않음)
 */
export async function runTypecheck(options: TypecheckOptions): Promise<void> {
  const { targets, debug } = options;
  const cwd = process.cwd();

  // pino 로거 (debug 모드에서만 활성화)
  const logger = pino({
    name: "sd-cli:typecheck",
    level: debug ? "debug" : "silent",
    transport: debug ? { target: "pino-pretty" } : undefined,
  });

  logger.debug({ targets }, "타입체크 시작");

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };

  // tsconfig.json 로드
  const configPath = path.resolve(cwd, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    logger.error({ err: configFile.error }, "tsconfig.json 로드 실패");
    const message = ts.formatDiagnosticsWithColorAndContext([configFile.error], formatHost);
    process.stderr.write(message);
    process.exitCode = 1;
    return;
  }

  // tsconfig 파싱
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    cwd,
    undefined,
    configPath,
  );

  if (parsedConfig.errors.length > 0) {
    logger.error({ errorCount: parsedConfig.errors.length }, "tsconfig.json 파싱 실패");
    const message = ts.formatDiagnosticsWithColorAndContext(parsedConfig.errors, formatHost);
    process.stderr.write(message);
    process.exitCode = 1;
    return;
  }

  // sd.config.ts 로드
  const sdConfigPath = path.resolve(cwd, "sd.config.ts");
  let sdConfig: SdConfig;
  try {
    // jiti: TypeScript 설정 파일(.ts)을 런타임에 import하기 위해 사용
    const jiti = createJiti(import.meta.url);
    const sdConfigModule = await jiti.import(sdConfigPath);

    let configFn: unknown;
    if (
      sdConfigModule != null &&
      typeof sdConfigModule === "object" &&
      "default" in sdConfigModule
    ) {
      configFn = sdConfigModule.default;
    } else {
      throw new SdError("sd.config.ts에 default export가 없습니다.");
    }

    if (typeof configFn !== "function") {
      throw new SdError("sd.config.ts의 default export는 함수여야 합니다.");
    }
    sdConfig = configFn() as SdConfig;
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    // sd.config.ts가 없거나 로드 실패 시 기본값 사용
    sdConfig = { packages: {} };
    logger.debug({ err }, "sd.config.ts 로드 실패, 기본값 사용");
  }

  // targets가 지정되면 fileNames 필터링
  const fileNames = PathUtils.filterByTargets(parsedConfig.fileNames, targets, cwd);

  if (fileNames.length === 0) {
    console.log("✔ 타입체크할 파일이 없습니다.");
    logger.info("타입체크할 파일 없음");
    return;
  }

  // 파일 분류
  const classified = classifyFiles(fileNames, cwd, sdConfig);
  logger.debug(
    {
      packageCount: classified.byPackage.size,
      packageTestCount: classified.byPackageTests.size,
      testCount: classified.byTests.size,
      rootCount: classified.root.length,
    },
    "파일 분류 완료",
  );

  // 타입체크 작업 생성
  const taskInfos = createTypecheckTaskInfos(classified, cwd);

  if (taskInfos.length === 0) {
    console.log("✔ 타입체크할 작업이 없습니다.");
    return;
  }

  // 동시성 설정 (스레드 수의 7/8, 내림, 최소 1, 작업 수 이하)
  const maxConcurrency = Math.max(Math.floor(os.cpus().length * 7 / 8), 1);
  const concurrency = Math.min(maxConcurrency, taskInfos.length);
  logger.debug({ concurrency, maxConcurrency, taskCount: taskInfos.length }, "동시성 설정");

  // Worker 풀 생성 (작업 수만큼만 생성)
  const workerPath = path.resolve(import.meta.dirname, "../workers/typecheck.worker.ts");
  const workers: SdWorkerProxy<typeof TypecheckWorkerModule>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(SdWorker.create<typeof TypecheckWorkerModule>(workerPath));
  }

  // 결과 수집용
  const allResults: TypecheckResult[] = [];
  let hasErrors = false;

  // 작업 큐
  let taskIndex = 0;

  // Worker에서 작업 실행
  async function runNextTask(worker: SdWorkerProxy<typeof TypecheckWorkerModule>): Promise<void> {
    while (taskIndex < taskInfos.length) {
      const currentIndex = taskIndex++;
      const taskInfo = taskInfos[currentIndex];

      const result = await worker.typecheck(
        taskInfo,
        parsedConfig.options as unknown as Record<string, unknown>,
      );

      allResults.push(result);
      if (result.hasErrors) hasErrors = true;
    }
  }

  // listr2로 진행 상황 표시
  const listr = new Listr(
    taskInfos.map((taskInfo) => ({
      title: taskInfo.name,
      task: async () => {
        // 실제 작업은 worker에서 병렬로 실행됨
        // 여기서는 해당 작업의 결과를 기다림
        while (!allResults.some((r) => r.taskName === taskInfo.name)) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      },
    })),
    {
      concurrent: concurrency,
      exitOnError: false,
      renderer: debug ? "verbose" : "default",
    },
  );

  // 병렬로 모든 worker 실행
  const workerPromises = workers.map((worker) => runNextTask(worker));

  // listr와 worker 동시 실행
  await Promise.all([listr.run(), ...workerPromises]);

  // Worker 종료
  await Promise.all(workers.map((w) => w.terminate()));

  // 결과 출력
  const allDiagnostics: ts.Diagnostic[] = [];
  for (const result of allResults) {
    for (const serialized of result.diagnostics) {
      allDiagnostics.push(deserializeDiagnostic(serialized, formatHost));
    }
  }

  const errorCount = allDiagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  ).length;
  const warningCount = allDiagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Warning,
  ).length;

  if (hasErrors) {
    logger.error({ errorCount, warningCount }, "타입체크 에러 발생");
  } else if (warningCount > 0) {
    logger.info({ errorCount, warningCount }, "타입체크 완료 (경고 있음)");
  } else {
    logger.info({ errorCount, warningCount }, "타입체크 완료");
  }

  if (allDiagnostics.length > 0) {
    const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
    const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
    process.stdout.write(message);
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

//#endregion
