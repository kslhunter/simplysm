import path from "path";
import fs from "fs";
import cp from "child_process";
import esbuild from "esbuild";
import { createWorker, FsWatcher, pathNorm } from "@simplysm/core-node";
import { consola } from "consola";
import {
  parseRootTsconfig,
  getPackageSourceFiles,
  getCompilerOptionsForPackage,
} from "../utils/tsconfig";
import {
  createServerEsbuildOptions,
  collectUninstalledOptionalPeerDeps,
  collectNativeModuleExternals,
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
import { registerCleanupHandlers } from "../utils/worker-utils";
import { collectDeps } from "../utils/package-utils";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";

//#region Types

/**
 * Server 빌드 정보 (일회성 빌드용)
 */
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** sd.config.ts에서 수동 지정한 external 모듈 */
  externals?: string[];
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
  /** Package manager to use (affects mise.toml or volta settings generation) */
  packageManager?: "volta" | "mise";
}

/**
 * Server 빌드 결과
 */
export interface ServerBuildResult {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Server Watch 정보
 */
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** sd.config.ts에서 수동 지정한 external 모듈 */
  externals?: string[];
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}

/**
 * 빌드 이벤트
 */
export interface ServerBuildEvent {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * 에러 이벤트
 */
export interface ServerErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface ServerWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ServerBuildEvent;
  error: ServerErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:server:worker");

/** esbuild build context (정리 대상) */
let esbuildContext: esbuild.BuildContext | undefined;

/** 마지막 빌드의 metafile (rebuild 시 변경 파일 필터링용) */
let lastMetafile: esbuild.Metafile | undefined;

/** public 파일 watcher (정리 대상) */
let publicWatcher: FsWatcher | undefined;

/** 소스 + scope 패키지 watcher (정리 대상) */
let srcWatcher: FsWatcher | undefined;

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  // 전역 변수를 임시 변수로 캡처 후 초기화
  // (Promise.all 대기 중 다른 호출에서 전역 변수를 수정할 수 있으므로)
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;
  lastMetafile = undefined;

  const watcherToClose = publicWatcher;
  publicWatcher = undefined;

  const srcWatcherToClose = srcWatcher;
  srcWatcher = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }

  if (watcherToClose != null) {
    await watcherToClose.close();
  }

  if (srcWatcherToClose != null) {
    await srcWatcherToClose.close();
  }
}

/**
 * 세 가지 소스에서 external 모듈을 수집하여 합친다.
 * 1. 미설치 optional peer deps
 * 2. binding.gyp 네이티브 모듈
 * 3. sd.config.ts 수동 지정
 */
function collectAllExternals(pkgDir: string, manualExternals?: string[]): string[] {
  const optionalPeerDeps = collectUninstalledOptionalPeerDeps(pkgDir);
  const nativeModules = collectNativeModuleExternals(pkgDir);
  const manual = manualExternals ?? [];

  const merged = [...new Set([...optionalPeerDeps, ...nativeModules, ...manual])];

  if (optionalPeerDeps.length > 0) {
    logger.debug("미설치 optional peer deps (external):", optionalPeerDeps);
  }
  if (nativeModules.length > 0) {
    logger.debug("네이티브 모듈 (external):", nativeModules);
  }
  if (manual.length > 0) {
    logger.debug("수동 지정 (external):", manual);
  }

  return merged;
}

/**
 * 프로덕션 배포용 파일 생성 (일회성 빌드에서만 호출)
 *
 * - dist/package.json: external 모듈을 dependencies로 포함 (volta 사용 시 volta 필드 추가)
 * - dist/mise.toml: Node 버전 지정 (packageManager === "mise"일 때만)
 * - dist/openssl.cnf: 레거시 OpenSSL 프로바이더 활성화
 * - dist/pm2.config.cjs: PM2 프로세스 설정 (pm2 옵션이 있을 때만)
 */
function generateProductionFiles(info: ServerBuildInfo, externals: string[]): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  logger.debug("GEN package.json...");
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    const deps: Record<string, string> = {};
    for (const ext of externals) {
      deps[ext] = "*";
    }
    distPkgJson["dependencies"] = deps;
  }
  if (info.packageManager === "volta") {
    const nodeVersion = cp.execSync("node -v").toString().trim();
    distPkgJson["volta"] = { node: nodeVersion };
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml (packageManager === "mise"일 때만)
  if (info.packageManager === "mise") {
    logger.debug("GEN mise.toml...");
    const rootMiseTomlPath = path.join(info.cwd, "mise.toml");
    let nodeVersion = "20";
    if (fs.existsSync(rootMiseTomlPath)) {
      const miseContent = fs.readFileSync(rootMiseTomlPath, "utf-8");
      const match = /node\s*=\s*"([^"]+)"/.exec(miseContent);
      if (match != null) {
        nodeVersion = match[1];
      }
    }
    fs.writeFileSync(path.join(distDir, "mise.toml"), `[tools]\nnode = "${nodeVersion}"\n`);
  }

  // dist/openssl.cnf
  logger.debug("GEN openssl.cnf...");
  fs.writeFileSync(
    path.join(distDir, "openssl.cnf"),
    [
      "nodejs_conf = openssl_init",
      "",
      "[openssl_init]",
      "providers = provider_sect",
      "ssl_conf = ssl_sect",
      "",
      "[provider_sect]",
      "default = default_sect",
      "legacy = legacy_sect",
      "",
      "[default_sect]",
      "activate = 1",
      "",
      "[legacy_sect]",
      "activate = 1",
      "",
      "[ssl_sect]",
      "system_default = system_default_sect",
      "",
      "[system_default_sect]",
      "Options = UnsafeLegacyRenegotiation",
    ].join("\n"),
  );

  // dist/pm2.config.cjs (pm2 설정이 있을 때만)
  if (info.pm2 != null) {
    logger.debug("GEN pm2.config.cjs...");

    const pm2Name = info.pm2.name ?? pkgJson.name.replace(/@/g, "").replace(/[/\\]/g, "-");
    const ignoreWatch = JSON.stringify([
      "node_modules",
      "www",
      ...(info.pm2.ignoreWatchPaths ?? []),
    ]);
    const envObj: Record<string, string> = {
      NODE_ENV: "production",
      TZ: "Asia/Seoul",
      ...(info.env ?? {}),
    };
    const envStr = JSON.stringify(envObj, undefined, 4);

    const interpreterLine =
      info.packageManager === "volta"
        ? ""
        : `  interpreter: cp.execSync("mise which node").toString().trim(),\n`;

    const pm2Config = [
      `const cp = require("child_process");`,
      ``,
      `module.exports = {`,
      `  name: ${JSON.stringify(pm2Name)},`,
      `  script: "main.js",`,
      `  watch: true,`,
      `  watch_delay: 2000,`,
      `  ignore_watch: ${ignoreWatch},`,
      interpreterLine.trimEnd(),
      `  interpreter_args: "--openssl-config=openssl.cnf",`,
      `  env: ${envStr.replace(/\n/g, "\n  ")},`,
      `  arrayProcess: "concat",`,
      `  useDelTargetNull: true,`,
      `};`,
    ]
      .filter((line) => line !== "")
      .join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
}

// 프로세스 종료 전 리소스 정리 (SIGTERM/SIGINT)
// 주의: worker.terminate()는 이 핸들러들을 호출하지 않고 즉시 종료됨.
// 그러나 watch 모드에서 정상 종료는 메인 프로세스의 SIGINT/SIGTERM을 통해 이루어지므로 문제없음.
registerCleanupHandlers(cleanup, logger);

//#endregion

//#region Worker

/**
 * 일회성 빌드
 */
async function build(info: ServerBuildInfo): Promise<ServerBuildResult> {
  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

  try {
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 서버는 node 환경
    const compilerOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      "node",
      info.pkgDir,
    );

    // 모든 external 수집 (optional peer deps + native modules + manual)
    const external = collectAllExternals(info.pkgDir, info.externals);

    // esbuild 일회성 빌드
    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      compilerOptions,
      env: info.env,
      external,
    });

    const result = await esbuild.build(esbuildOptions);

    // Generate .config.json
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

    // Copy public/ to dist/ (production build: no public-dev)
    await copyPublicFiles(info.pkgDir, false);

    // Generate production files (package.json, mise.toml, openssl.cnf, pm2.config.cjs)
    generateProductionFiles(info, external);

    const errors = result.errors.map((e) => e.text);
    const warnings = result.warnings.map((w) => w.text);
    return {
      success: result.errors.length === 0,
      mainJsPath,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return {
      success: false,
      mainJsPath,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/** startWatch 호출 여부 플래그 */
let isWatchStarted = false;

/**
 * esbuild context 생성 및 초기 빌드 수행
 */
async function createAndBuildContext(
  info: ServerWatchInfo,
  isFirstBuild: boolean,
  resolveFirstBuild?: () => void,
): Promise<esbuild.BuildContext> {
  const parsedConfig = parseRootTsconfig(info.cwd);
  const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
  const compilerOptions = await getCompilerOptionsForPackage(
    parsedConfig.options,
    "node",
    info.pkgDir,
  );

  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");
  const external = collectAllExternals(info.pkgDir, info.externals);
  const baseOptions = createServerEsbuildOptions({
    pkgDir: info.pkgDir,
    entryPoints,
    compilerOptions,
    env: info.env,
    external,
  });

  let isBuildFirstTime = isFirstBuild;

  const context = await esbuild.context({
    ...baseOptions,
    metafile: true,
    write: false,
    plugins: [
      {
        name: "watch-notify",
        setup(pluginBuild) {
          pluginBuild.onStart(() => {
            sender.send("buildStart", {});
          });

          pluginBuild.onEnd(async (result) => {
            // metafile 저장
            if (result.metafile != null) {
              lastMetafile = result.metafile;
            }

            const errors = result.errors.map((e) => e.text);
            const warnings = result.warnings.map((w) => w.text);
            const success = result.errors.length === 0;

            // output 파일 쓰기 및 변경 여부 확인
            let hasOutputChange = false;
            if (success && result.outputFiles != null) {
              hasOutputChange = await writeChangedOutputFiles(result.outputFiles);
            }

            if (isBuildFirstTime && success) {
              const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
              fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));
            }

            // 첫 빌드이거나, output이 변경되었거나, 에러인 경우에만 build 이벤트 발생
            if (isBuildFirstTime || hasOutputChange || !success) {
              sender.send("build", {
                success,
                mainJsPath,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
              });
            } else {
              logger.debug("output 변경 없음, 서버 재시작 skip");
            }

            if (isBuildFirstTime) {
              isBuildFirstTime = false;
              resolveFirstBuild?.();
            }
          });
        },
      },
    ],
  });

  await context.rebuild();

  return context;
}

/**
 * watch 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 * @throws 이미 watch가 시작된 경우
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    // 첫 번째 빌드 완료 대기를 위한 Promise
    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    // 초기 esbuild context 생성 및 빌드
    esbuildContext = await createAndBuildContext(info, true, resolveFirstBuild);

    // 첫 번째 빌드 완료 대기
    await firstBuildPromise;

    // Watch public/ and public-dev/ (dev mode includes public-dev)
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // 의존성 기반 감시 경로 수집
    const { workspaceDeps, replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    const watchPaths: string[] = [];

    // 1) 서버 패키지 자신 + workspace 의존 패키지 소스
    const watchDirs = [
      info.pkgDir,
      ...workspaceDeps.map((d) => path.join(info.cwd, "packages", d)),
    ];
    for (const dir of watchDirs) {
      watchPaths.push(path.join(dir, "src", "**", "*"));
      watchPaths.push(path.join(dir, "*.{ts,js,css}"));
    }

    // 2) replaceDeps 의존 패키지 dist (루트 + 패키지 node_modules)
    for (const pkg of replaceDeps) {
      watchPaths.push(path.join(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.js"));
      watchPaths.push(
        path.join(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.js"),
      );
    }

    // FsWatcher 시작
    srcWatcher = await FsWatcher.watch(watchPaths);

    // 파일 변경 감지 시 처리
    srcWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        // 파일 추가/삭제가 있으면 context 재생성 (import graph 변경 가능)
        const hasFileAddOrRemove = changes.some((c) => c.event === "add" || c.event === "unlink");

        if (hasFileAddOrRemove) {
          logger.debug("파일 추가/삭제 감지, context 재생성");

          const oldContext = esbuildContext;
          esbuildContext = await createAndBuildContext(info, false);

          if (oldContext != null) {
            await oldContext.dispose();
          }
          return;
        }

        // 파일 변경만 있는 경우: metafile 필터링
        if (esbuildContext == null) return;

        // metafile이 없으면 (첫 빌드 전) 무조건 rebuild
        if (lastMetafile == null) {
          await esbuildContext.rebuild();
          return;
        }

        // metafile.inputs 키를 절대경로(NormPath)로 변환하여 비교
        const metafileAbsPaths = new Set(
          Object.keys(lastMetafile.inputs).map((key) => pathNorm(info.cwd, key)),
        );

        const hasRelevantChange = changes.some((c) => metafileAbsPaths.has(c.path));

        if (hasRelevantChange) {
          await esbuildContext.rebuild();
        } else {
          logger.debug("변경된 파일이 빌드에 포함되지 않음, rebuild skip");
        }
      } catch (err) {
        sender.send("error", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * watch 중지
 * @remarks esbuild context를 정리합니다.
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  ServerWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
