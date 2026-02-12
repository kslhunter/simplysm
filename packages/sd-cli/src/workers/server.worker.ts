import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import { parseRootTsconfig, getPackageSourceFiles, getCompilerOptionsForPackage } from "../utils/tsconfig";
import {
  createServerEsbuildOptions,
  collectUninstalledOptionalPeerDeps,
  collectNativeModuleExternals,
} from "../utils/esbuild-config";

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
    noInterpreter?: boolean;
  };
}

/**
 * Server 빌드 결과
 */
export interface ServerBuildResult {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
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
}

/**
 * 빌드 이벤트
 */
export interface ServerBuildEvent {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
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

/**
 * 리소스 정리
 */
async function cleanup(): Promise<void> {
  // 전역 변수를 임시 변수로 캡처 후 초기화
  // (Promise.all 대기 중 다른 호출에서 전역 변수를 수정할 수 있으므로)
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
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
 * - dist/package.json: external 모듈을 dependencies로 포함
 * - dist/mise.toml: Node 버전 지정
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
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml
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
    const ignoreWatch = JSON.stringify(["node_modules", "www", ...(info.pm2.ignoreWatchPaths ?? [])]);
    const envObj: Record<string, string> = {
      NODE_ENV: "production",
      TZ: "Asia/Seoul",
      SD_VERSION: pkgJson.version,
      ...(info.env ?? {}),
    };
    const envStr = JSON.stringify(envObj, undefined, 4);

    const interpreterLine = info.pm2.noInterpreter
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
process.on("SIGTERM", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

process.on("SIGINT", () => {
  cleanup()
    .catch((err) => {
      logger.error("cleanup 실패", err);
    })
    .finally(() => {
      process.exit(0);
    });
});

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
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "node", info.pkgDir);

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

    // Generate production files (package.json, mise.toml, openssl.cnf, pm2.config.cjs)
    generateProductionFiles(info, external);

    const errors = result.errors.map((e) => e.text);
    return {
      success: result.errors.length === 0,
      mainJsPath,
      errors: errors.length > 0 ? errors : undefined,
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
    // tsconfig 파싱
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // 서버는 node 환경
    const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, "node", info.pkgDir);

    const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

    // 첫 번째 빌드 완료 대기를 위한 Promise
    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    let isFirstBuild = true;

    // 모든 external 수집 (optional peer deps + native modules + manual)
    const external = collectAllExternals(info.pkgDir, info.externals);

    // esbuild 기본 옵션 생성
    const baseOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      compilerOptions,
      env: info.env,
      external,
    });

    // watch용 플러그인 추가
    esbuildContext = await esbuild.context({
      ...baseOptions,
      plugins: [
        {
          name: "watch-notify",
          setup(pluginBuild) {
            pluginBuild.onStart(() => {
              sender.send("buildStart", {});
            });

            pluginBuild.onEnd((result) => {
              const errors = result.errors.map((e) => e.text);
              const success = result.errors.length === 0;

              // Generate .config.json on first successful build
              if (isFirstBuild && success) {
                const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
                fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));
              }

              sender.send("build", { success, mainJsPath, errors: errors.length > 0 ? errors : undefined });

              if (isFirstBuild) {
                isFirstBuild = false;
                resolveFirstBuild();
              }
            });
          },
        },
      ],
    });

    await esbuildContext.watch();

    // 첫 번째 빌드 완료 대기
    await firstBuildPromise;
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
