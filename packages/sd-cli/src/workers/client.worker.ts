import { createServer, build as viteBuild, type ViteDevServer } from "vite";
import path from "path";
import fs from "node:fs";
import { createWorker } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import { registerCleanupHandlers, applyDebugLevel } from "../utils/worker-utils.js";
import { createClientViteConfig } from "../utils/vite-config.js";
import type { ScopeWatchReplaceDep } from "../utils/vite-scope-watch-plugin.js";
import type { SdBrowserSupportConfig, SdPwaConfig } from "../sd-config.types.js";
import type { LintWithProgramResult } from "../utils/lint-with-program.js";

applyDebugLevel();

//#region Types

/** Client 빌드 입력 정보 */
export interface ClientBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** Vite dev server 포트 (standalone clients with server: number) */
  port?: number;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** replaceDeps 목록 (dev 모드에서 sdScopeWatchPlugin에 전달) */
  replaceDeps?: ScopeWatchReplaceDep[];
  /** 브라우저 호환성 설정 */
  browserSupport?: SdBrowserSupportConfig;
  /** PWA 설정. false로 비활성화. 미설정 시 기본값으로 활성화 */
  pwa?: false | SdPwaConfig;
  /** Enable lint using ts.Program from compilation */
  enableLint?: boolean;
}

/** Client 빌드 결과 */
export interface ClientBuildResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  lint?: LintWithProgramResult;
}

/** Worker 이벤트 타입 */
export interface ClientWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ClientBuildResult;
  serverReady: { port: number };
  error: { message: string };
  scopeRebuild: Record<string, never>;
}

//#endregion

//#region Worker

const logger = consola.withTag("sd:cli:client:worker");

let viteServer: ViteDevServer | undefined;

function resolvePackageInfo(info: ClientBuildInfo): {
  tsconfigPath: string;
  pkgName: string;
} {
  const tsconfigPath = path.join(info.pkgDir, "tsconfig.json");
  const pkgJsonPath = path.join(info.pkgDir, "package.json");
  const pkgName = (
    JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string }
  ).name;
  return { tsconfigPath, pkgName };
}

/**
 * dev server 시작. Vite dev server를 생성하고 listen한다.
 * 서버가 준비되면 serverReady 이벤트로 포트를 알린다.
 */
async function startWatch(info: ClientBuildInfo): Promise<ClientBuildResult> {
  logger.debug(`[${info.name}] client worker startWatch 시작 (port: ${info.port ?? "auto"})`);
  try {
    const { tsconfigPath, pkgName } = resolvePackageInfo(info);

    // polyfills.ts 자동 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fs.existsSync(polyfillsPath) ? ["./src/polyfills.ts"] : undefined;

    const viteConfig = await createClientViteConfig({
      pkgDir: info.pkgDir,
      pkgName,
      mode: "dev",
      tsconfigPath,
      serverPort: info.port ?? 0,
      env: info.env,
      onBuildStart: () => sender.send("buildStart", {}),
      onBuild: (result) => sender.send("build", result),
      enableLint: info.enableLint,
      replaceDeps: info.replaceDeps,
      onScopeRebuild: () => sender.send("scopeRebuild", {}),
      browserslist: info.browserSupport?.browserslist,
      postCssPlugins: info.browserSupport?.postCss?.plugins,
      legacyModule: info.browserSupport?.legacyModule,
      polyfills,
      pwa: info.pwa,
    });

    logger.debug(`[${info.name}] Vite server 생성 시작`);
    viteServer = await createServer(viteConfig);
    await viteServer.listen();
    logger.debug(`[${info.name}] Vite server listen 완료`);

    // 실제 포트 감지
    const address = viteServer.httpServer?.address();
    const actualPort =
      typeof address === "object" && address != null ? address.port : undefined;

    if (actualPort == null) {
      sender.send("error", {
        message: "Vite dev server 포트를 감지할 수 없습니다.",
      });
      return {
        success: false,
        errors: ["Vite dev server 포트를 감지할 수 없습니다."],
      };
    }

    sender.send("serverReady", { port: actualPort });

    // .config.json 생성
    writeConfigJson(info.pkgDir, info.configs);

    return { success: true };
  } catch (err) {
    const message = errNs.message(err);
    sender.send("error", { message });
    return { success: false, errors: [message] };
  }
}

/**
 * dev server 중지. Vite server를 정리한다.
 */
async function stopWatch(): Promise<void> {
  logger.debug("Vite server 정리 시작");
  const serverToClose = viteServer;
  viteServer = undefined;
  if (serverToClose != null) {
    await serverToClose.close();
  }
  logger.debug("Vite server 정리 완료");
}

/**
 * 프로덕션 빌드. Vite build API로 번들을 생성한다.
 */
async function build(info: ClientBuildInfo): Promise<ClientBuildResult> {
  logger.debug(`[${info.name}] client worker build 시작`);
  try {
    const { tsconfigPath, pkgName } = resolvePackageInfo(info);

    // polyfills.ts 자동 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fs.existsSync(polyfillsPath) ? ["./src/polyfills.ts"] : undefined;

    let lintResult: LintWithProgramResult | undefined;

    const viteConfig = await createClientViteConfig({
      pkgDir: info.pkgDir,
      pkgName,
      mode: "build",
      tsconfigPath,
      serverPort: 0,
      env: info.env,
      enableLint: info.enableLint,
      onBuild: (result) => {
        if (result.lint != null) {
          lintResult = result.lint;
        }
      },
      browserslist: info.browserSupport?.browserslist,
      postCssPlugins: info.browserSupport?.postCss?.plugins,
      legacyModule: info.browserSupport?.legacyModule,
      polyfills,
      pwa: info.pwa,
    });

    await viteBuild(viteConfig);

    // .config.json 생성
    writeConfigJson(info.pkgDir, info.configs);

    logger.debug(`[${info.name}] client worker build 완료`);
    return { success: true, lint: lintResult };
  } catch (err) {
    const message = errNs.message(err);
    logger.debug(`[${info.name}] client worker build 예외: ${message}`);
    return { success: false, errors: [message] };
  }
}

/** dist/.config.json 생성 */
function writeConfigJson(
  pkgDir: string,
  configs?: Record<string, unknown>,
): void {
  const distDir = path.join(pkgDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, ".config.json"),
    JSON.stringify(configs ?? {}, undefined, 2),
  );
}

registerCleanupHandlers(async () => {
  await stopWatch();
}, logger);

const sender = createWorker<
  {
    build: typeof build;
    startWatch: typeof startWatch;
    stopWatch: typeof stopWatch;
  },
  ClientWorkerEvents
>({ build, startWatch, stopWatch });

export default sender;

//#endregion
