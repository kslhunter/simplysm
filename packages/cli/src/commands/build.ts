import path from "path";
import ts from "typescript";
import { Listr, type ListrTask } from "listr2";
import { Worker, type WorkerProxy, fsRm } from "@simplysm/core-node";
import "@simplysm/core-common";
import { consola, LogLevels } from "consola";
import type { SdConfig, SdBuildPackageConfig, SdClientPackageConfig, SdServerPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { getVersion } from "../utils/build-env";
import type { TypecheckEnv } from "../utils/tsconfig";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import { runLint, type LintOptions } from "./lint";
import type * as LibraryWorkerModule from "../workers/library.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
import type * as ClientWorkerModule from "../workers/client.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";

//#region Types

/**
 * Build 명령 옵션
 */
export interface BuildOptions {
  /** 빌드할 패키지 필터 (빈 배열이면 모든 패키지) */
  targets: string[];
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

/**
 * 빌드 결과
 */
interface BuildResult {
  name: string;
  target: string;
  type: "js" | "dts" | "vite" | "capacitor" | "electron";
  success: boolean;
  errors?: string[];
  diagnostics?: ts.Diagnostic[];
}

/**
 * 패키지 분류 결과
 */
interface ClassifiedPackages {
  /** node/browser/neutral 타겟 (JS + dts) */
  buildPackages: Array<{ name: string; config: SdBuildPackageConfig }>;
  /** client 타겟 (Vite build + typecheck) */
  clientPackages: Array<{ name: string; config: SdClientPackageConfig }>;
  /** server 타겟 (JS 빌드, dts 제외) */
  serverPackages: Array<{ name: string; config: SdServerPackageConfig }>;
}

//#endregion

//#region Utilities

/**
 * 패키지를 타겟별로 분류
 * - node/browser/neutral: buildPackages (JS + dts)
 * - client: clientPackages (Vite build + typecheck)
 * - server: serverPackages (JS 빌드, dts 제외)
 * - scripts: 제외
 */
function classifyPackages(
  packages: Record<
    string,
    SdBuildPackageConfig | SdClientPackageConfig | SdServerPackageConfig | { target: "scripts" } | undefined
  >,
  targets: string[],
): ClassifiedPackages {
  const buildPackages: ClassifiedPackages["buildPackages"] = [];
  const clientPackages: ClassifiedPackages["clientPackages"] = [];
  const serverPackages: ClassifiedPackages["serverPackages"] = [];

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;
    if (config.target === "scripts") continue;

    // targets가 지정되면 해당 패키지만 포함
    if (targets.length > 0 && !targets.includes(name)) continue;

    if (config.target === "client") {
      clientPackages.push({ name, config });
    } else if (config.target === "server") {
      serverPackages.push({ name, config });
    } else {
      buildPackages.push({ name, config });
    }
  }

  return { buildPackages, clientPackages, serverPackages };
}

/**
 * dist 폴더 삭제
 */
async function cleanDistFolders(cwd: string, packageNames: string[]): Promise<void> {
  await Promise.all(packageNames.map((name) => fsRm(path.join(cwd, "packages", name, "dist"))));
}

//#endregion

//#region Main

/**
 * 프로덕션 빌드를 실행한다.
 *
 * - `sd.config.ts`를 로드하여 패키지별 빌드 타겟 정보 확인 (필수)
 * - lint 실행
 * - dist 폴더 정리 (clean build)
 * - `node`/`browser`/`neutral` 타겟: esbuild JS 빌드 + dts 생성 (타입체크 포함)
 * - `client` 타겟: Vite production 빌드 + typecheck (dts 불필요)
 * - 하나라도 실패하면 `process.exitCode = 1` 설정
 *
 * @param options - build 실행 옵션
 * @returns 완료 시 resolve
 */
export async function runBuild(options: BuildOptions): Promise<void> {
  const { targets } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:build");

  logger.debug("빌드 시작", { targets });

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // VER, DEV 환경변수 준비
  const version = await getVersion(cwd);
  const baseEnv = { VER: version, DEV: "false" };

  // 패키지 분류
  const { buildPackages, clientPackages, serverPackages } = classifyPackages(sdConfig.packages, targets);
  const allPackageNames = [
    ...buildPackages.map((p) => p.name),
    ...clientPackages.map((p) => p.name),
    ...serverPackages.map((p) => p.name),
  ];

  if (allPackageNames.length === 0) {
    process.stdout.write("✔ 빌드할 패키지가 없습니다.\n");
    return;
  }

  logger.debug("패키지 분류 완료", {
    buildPackages: buildPackages.map((p) => p.name),
    clientPackages: clientPackages.map((p) => p.name),
    serverPackages: serverPackages.map((p) => p.name),
  });

  // 결과 수집
  const results: BuildResult[] = [];
  // 에러 추적 (객체로 래핑하여 콜백 내 수정 추적 가능하게 함)
  const state = { hasError: false };

  // Worker 경로
  const libraryWorkerPath = path.resolve(import.meta.dirname, "../workers/library.worker.ts");
  const serverWorkerPath = path.resolve(import.meta.dirname, "../workers/server.worker.ts");
  const clientWorkerPath = path.resolve(import.meta.dirname, "../workers/client.worker.ts");
  const dtsWorkerPath = path.resolve(import.meta.dirname, "../workers/dts.worker.ts");

  // 파일 캐시 (diagnostics 출력용)
  const fileCache = new Map<string, string>();

  // formatHost (diagnostics 출력용)
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => cwd,
    getNewLine: () => ts.sys.newLine,
  };

  // Lint 옵션 (전체 패키지 대상)
  const lintOptions: LintOptions = {
    targets: allPackageNames.map((name) => `packages/${name}`),
    fix: false,
    timing: false,
  };

  // Listr 구조: Lint → Clean → Build (순차)
  const mainListr = new Listr(
    [
      {
        title: "Lint",
        task: async () => {
          await runLint(lintOptions);
          // lint 에러가 있으면 process.exitCode가 1로 설정됨
          if (process.exitCode === 1) {
            state.hasError = true;
          }
        },
      },
      {
        title: "Clean",
        task: async () => {
          await cleanDistFolders(cwd, allPackageNames);
        },
      },
      {
        title: "Build",
        task: (_, task) => {
          const buildTasks: ListrTask[] = [];

          // buildPackages: JS 빌드 + dts 생성
          for (const { name, config } of buildPackages) {
            const pkgDir = path.join(cwd, "packages", name);
            const env: TypecheckEnv = config.target === "node" ? "node" : "browser";

            buildTasks.push({
              title: `${name} (${config.target})`,
              task: async () => {
                // JS 빌드와 DTS 생성을 병렬 실행
                const libraryWorker: WorkerProxy<typeof LibraryWorkerModule> =
                  Worker.create<typeof LibraryWorkerModule>(libraryWorkerPath);
                const dtsWorker: WorkerProxy<typeof DtsWorkerModule> =
                  Worker.create<typeof DtsWorkerModule>(dtsWorkerPath);

                try {
                  const [buildResult, dtsResult] = await Promise.all([
                    // JS 빌드
                    libraryWorker.build({ name, config, cwd, pkgDir }),
                    // DTS 생성
                    dtsWorker.buildDts({ name, cwd, pkgDir, env, emit: true }),
                  ]);

                  // JS 빌드 결과 처리
                  results.push({
                    name,
                    target: config.target,
                    type: "js",
                    success: buildResult.success,
                    errors: buildResult.errors,
                  });
                  if (!buildResult.success) state.hasError = true;

                  // DTS 결과 처리
                  const diagnostics = dtsResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
                  results.push({
                    name,
                    target: config.target,
                    type: "dts",
                    success: dtsResult.success,
                    errors: dtsResult.errors,
                    diagnostics,
                  });
                  if (!dtsResult.success) state.hasError = true;
                } finally {
                  await Promise.all([libraryWorker.terminate(), dtsWorker.terminate()]);
                }
              },
            });
          }

          // clientPackages: Vite 빌드 + typecheck + Capacitor 빌드
          for (const { name, config } of clientPackages) {
            const pkgDir = path.join(cwd, "packages", name);

            buildTasks.push({
              title: `${name} (client)`,
              task: async () => {
                // Vite 빌드와 타입체크를 병렬 실행
                const clientWorker: WorkerProxy<typeof ClientWorkerModule> =
                  Worker.create<typeof ClientWorkerModule>(clientWorkerPath);
                const dtsWorker: WorkerProxy<typeof DtsWorkerModule> =
                  Worker.create<typeof DtsWorkerModule>(dtsWorkerPath);

                try {
                  const clientConfig: SdClientPackageConfig = {
                    ...config,
                    env: { ...baseEnv, ...config.env },
                  };
                  const [clientResult, dtsResult] = await Promise.all([
                    // Vite production 빌드
                    clientWorker.build({ name, config: clientConfig, cwd, pkgDir }),
                    // typecheck (dts 없이)
                    dtsWorker.buildDts({
                      name,
                      cwd,
                      pkgDir,
                      env: "browser",
                      emit: false,
                    }),
                  ]);

                  // Vite 빌드 결과 처리
                  results.push({
                    name,
                    target: "client",
                    type: "vite",
                    success: clientResult.success,
                    errors: clientResult.errors,
                  });
                  if (!clientResult.success) state.hasError = true;

                  // 타입체크 결과 처리
                  const diagnostics = dtsResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
                  results.push({
                    name,
                    target: "client",
                    type: "dts",
                    success: dtsResult.success,
                    errors: dtsResult.errors,
                    diagnostics,
                  });
                  if (!dtsResult.success) state.hasError = true;
                } finally {
                  await Promise.all([clientWorker.terminate(), dtsWorker.terminate()]);
                }

                // Capacitor 빌드 (설정이 있는 경우만)
                if (config.capacitor != null) {
                  const outPath = path.join(pkgDir, "dist");
                  try {
                    const cap = await Capacitor.create(pkgDir, config.capacitor);
                    await cap.initialize();
                    await cap.build(outPath);
                    results.push({
                      name,
                      target: "client",
                      type: "capacitor",
                      success: true,
                    });
                  } catch (err) {
                    results.push({
                      name,
                      target: "client",
                      type: "capacitor",
                      success: false,
                      errors: [err instanceof Error ? err.message : String(err)],
                    });
                    state.hasError = true;
                  }
                }

                // Electron 빌드 (설정이 있는 경우만)
                if (config.electron != null) {
                  const outPath = path.join(pkgDir, "dist");
                  try {
                    const electron = await Electron.create(pkgDir, config.electron);
                    await electron.initialize();
                    await electron.build(outPath);
                    results.push({
                      name,
                      target: "client",
                      type: "electron",
                      success: true,
                    });
                  } catch (err) {
                    results.push({
                      name,
                      target: "client",
                      type: "electron",
                      success: false,
                      errors: [err instanceof Error ? err.message : String(err)],
                    });
                    state.hasError = true;
                  }
                }
              },
            });
          }

          // serverPackages: JS 빌드만 (dts 생성 제외)
          for (const { name, config } of serverPackages) {
            const pkgDir = path.join(cwd, "packages", name);

            buildTasks.push({
              title: `${name} (server)`,
              task: async () => {
                const serverWorker: WorkerProxy<typeof ServerWorkerModule> =
                  Worker.create<typeof ServerWorkerModule>(serverWorkerPath);

                try {
                  const buildResult = await serverWorker.build({
                    name,
                    cwd,
                    pkgDir,
                    env: { ...baseEnv, ...config.env },
                  });

                  results.push({
                    name,
                    target: "server",
                    type: "js",
                    success: buildResult.success,
                    errors: buildResult.errors,
                  });
                  if (!buildResult.success) state.hasError = true;
                } finally {
                  await serverWorker.terminate();
                }
              },
            });
          }

          return task.newListr(buildTasks, { concurrent: true, exitOnError: false });
        },
      },
    ],
    {
      concurrent: false,
      exitOnError: false,
      renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
    },
  );

  try {
    await mainListr.run();
  } catch {
    // Listr 내부 에러는 results에 이미 수집됨
  }

  // 결과 출력
  const allDiagnostics: ts.Diagnostic[] = [];
  for (const result of results) {
    if (!result.success) {
      const typeLabel = result.type === "dts" ? "dts" : result.target;
      const errorLines: string[] = [`${result.name} (${typeLabel})`];
      if (result.errors != null) {
        for (const error of result.errors) {
          for (const line of error.split("\n")) {
            errorLines.push(`  → ${line}`);
          }
        }
      }
      consola.error(errorLines.join("\n"));
    }
    if (result.diagnostics != null) {
      allDiagnostics.push(...result.diagnostics);
    }
  }

  // diagnostics 출력 (중복 제거)
  if (allDiagnostics.length > 0) {
    const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
    const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
    process.stdout.write(message);
  }

  // 결과 로그 출력
  if (state.hasError) {
    logger.error("빌드 실패");
    process.exitCode = 1;
  } else {
    logger.info("빌드 완료");
  }
}

//#endregion
