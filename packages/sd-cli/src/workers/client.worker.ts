import path from "path";
import fs from "node:fs";
import { createWorker } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { setupWorkerLifecycle } from "./shared-worker-lifecycle.js";
import {
  createClientEsbuildContext,
  type ClientEsbuildResult,
} from "../esbuild/esbuild-client-config.js";
import { generateIndexHtml } from "../esbuild/esbuild-index-html.js";
import { applyPwa, createPwaHtmlTransform } from "../esbuild/esbuild-pwa.js";
import { createDevHttpServer, type DevHttpServer } from "../dev-server/dev-http-server.js";
import { createHmrService, type HmrService } from "../dev-server/hmr-service.js";
import { createHmrPostTransform } from "../dev-server/hmr-client-script.js";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public.js";
import type { SdBrowserSupportConfig, SdPwaConfig } from "../sd-config.types.js";
import type { FsWatcher } from "@simplysm/core-node";
import type esbuild from "esbuild";

//#region Types

/** Client 빌드 입력 정보 */
export interface ClientBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** dev server 포트 (standalone clients with server: number) */
  port?: number;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 런타임 설정 (dist/.config.json에 기록) */
  configs?: Record<string, unknown>;
  /** PWA 설정. false로 비활성화. 미설정 시 기본값으로 활성화 */
  pwa?: false | SdPwaConfig;
  /** 빌드 출력 경로 (미설정 시 pkgDir/dist) */
  outDir?: string;
  /** base 경로 (미설정 시 /{pkgName}/) */
  base?: string;
  /** 브라우저 지원 설정 (메인 프로세스에서 전달, Worker 내 sd.config.ts 재로드 방지) */
  browserSupport?: SdBrowserSupportConfig;
}

/** Client 빌드 결과 */
export interface ClientBuildResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/** Worker 이벤트 타입 */
export interface ClientWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ClientBuildResult;
  serverReady: { port: number };
  error: { message: string };
}

//#endregion

//#region Worker

let esbuildResult: ClientEsbuildResult | undefined;
let devServer: DevHttpServer | undefined;
let hmrService: HmrService | undefined;
let publicWatcher: FsWatcher | undefined;

const { logger, guardStartWatch } = setupWorkerLifecycle("client", async () => {
  await stopWatch();
});

function resolvePackageInfo(info: ClientBuildInfo): {
  pkgName: string;
  legacyModule: boolean;
  browserslist: string | string[] | undefined;
  postcssPlugins: [string, (object | string)?][] | undefined;
} {
  const pkgJsonPath = path.join(info.pkgDir, "package.json");
  const pkgName = (
    JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string }
  ).name;
  return {
    pkgName,
    legacyModule: info.browserSupport?.legacyModule === true,
    browserslist: info.browserSupport?.browserslist,
    postcssPlugins: info.browserSupport?.postCss?.plugins,
  };
}

/**
 * 프로덕션 빌드
 */
async function build(info: ClientBuildInfo): Promise<ClientBuildResult> {
  logger.debug(`[${info.name}] client worker build 시작`);
  try {
    const { pkgName, legacyModule, browserslist, postcssPlugins } =
      resolvePackageInfo(info);

    const outdir = info.outDir ?? path.join(info.pkgDir, "dist");

    // 1. public/ 복사
    await copyPublicFiles(info.pkgDir, false);

    // 2. polyfills 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fs.existsSync(polyfillsPath) ? ["src/polyfills.ts"] : undefined;

    // 3. esbuild context 생성
    const entryNames = ["main", ...(polyfills != null ? ["polyfills"] : [])];

    const templateUpdates = new Map<string, string>();
    const ctx = await createClientEsbuildContext({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      mode: "build",
      env: info.env,
      outdir,
      browserslist,
      polyfills,
      legacyModule,
      postcssPlugins,
      templateUpdates,
    });

    // 4. 빌드 실행
    const result = await ctx.context.rebuild();

    // 5. index.html 생성
    const name = pkgName.replace(/^@[^/]+\//, "");
    const basePath = info.base ?? `/${name}/`;
    const indexPath = path.join(info.pkgDir, "src", "index.html");

    const pwaHtmlTransform =
      info.pwa !== false ? createPwaHtmlTransform() : undefined;

    const indexResult = await generateIndexHtml({
      indexPath,
      metafile: result.metafile!,
      outdir,
      baseHref: basePath,
      mode: "build",
      entryNames,
      postTransform: pwaHtmlTransform,
    });

    fs.writeFileSync(path.join(outdir, "index.html"), indexResult.content);

    // 6. PWA 적용
    await applyPwa({
      pkgDir: info.pkgDir,
      pkgName: name,
      cwd: info.cwd,
      outdir,
      baseHref: basePath,
      mode: "build",
      pwa: info.pwa,
    });

    // 7. 리소스 해제
    await ctx.context.dispose();
    // SourceFileCache는 LMDB 기반. context.dispose()에 의해 정리됨.

    // 8. .config.json 기록
    writeConfigJson(path.join(info.pkgDir, "dist"), info.configs);

    logger.debug(`[${info.name}] client worker build 완료`);
    return {
      success: indexResult.errors.length === 0,
      errors: indexResult.errors.length > 0 ? indexResult.errors : undefined,
      warnings: indexResult.warnings.length > 0 ? indexResult.warnings : undefined,
    };
  } catch (err) {
    const errors: string[] = [];
    if (err != null && typeof err === "object" && "errors" in err) {
      const buildErrors = (err as { errors: Array<{ text: string }> }).errors;
      errors.push(...buildErrors.map((e) => e.text));
    }
    if (errors.length === 0) {
      errors.push(errNs.message(err));
    }
    logger.debug(`[${info.name}] client worker build 예외: ${errors.join("; ")}`);
    return { success: false, errors };
  }
}

/**
 * dev watch 시작
 */
async function startWatch(info: ClientBuildInfo): Promise<ClientBuildResult> {
  guardStartWatch();
  const { pkgName, legacyModule, browserslist, postcssPlugins } =
    resolvePackageInfo(info);

  logger.debug(
    `[${info.name}] client worker startWatch 시작 (port: ${info.port ?? "auto"}, legacy: ${legacyModule})`,
  );

  try {
    const outdir = path.join(info.pkgDir, "dist");
    const name = pkgName.replace(/^@[^/]+\//, "");
    const basePath = info.base ?? `/${name}/`;

    // 1. dist/ 초기화
    fs.rmSync(outdir, { recursive: true, force: true });

    // 2. public/ 복사 + 감시
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // 3. polyfills 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fs.existsSync(polyfillsPath) ? ["src/polyfills.ts"] : undefined;
    const entryNames = ["main", ...(polyfills != null ? ["polyfills"] : [])];

    // 4. templateUpdates Map + esbuild context 생성
    const templateUpdates = new Map<string, string>();
    let initialBuildResolve: ((result: ClientBuildResult) => void) | undefined;
    let isInitialBuild = true;

    esbuildResult = await createClientEsbuildContext({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      mode: "dev",
      env: info.env,
      outdir,
      browserslist,
      polyfills,
      legacyModule,
      postcssPlugins,
      templateUpdates: legacyModule ? undefined : templateUpdates,
      plugins: [
        {
          name: "sd-build-start",
          setup(pluginBuild: esbuild.PluginBuild) {
            const prevMtimes = new Map<string, number>();

            pluginBuild.onStart(() => {
              // loadResultCache 무효화: 변경된 JS 파일의 캐시 엔트리 제거
              if (esbuildResult != null) {
                const { loadResultCache } = esbuildResult.sourceFileCache;
                for (const file of loadResultCache.watchFiles) {
                  try {
                    const mtime = fs.statSync(file).mtimeMs;
                    const prev = prevMtimes.get(file);
                    if (prev != null && prev !== mtime) {
                      loadResultCache.invalidate(file);
                    }
                  } catch {
                    if (prevMtimes.has(file)) {
                      loadResultCache.invalidate(file);
                    }
                  }
                }
              }

              if (!isInitialBuild) {
                sender.send("buildStart", {});
              }
            });

            pluginBuild.onEnd(() => {
              if (esbuildResult == null) return;
              prevMtimes.clear();
              for (const file of esbuildResult.sourceFileCache.loadResultCache.watchFiles) {
                try {
                  prevMtimes.set(file, fs.statSync(file).mtimeMs);
                } catch {
                  // 삭제된 파일
                }
              }
            });
          },
        },
      ],
      onEnd: async (result: esbuild.BuildResult) => {
        try {
          // index.html 재생성
          if (result.metafile != null) {
            const hmrPostTransform = createHmrPostTransform(basePath);
            const indexPath = path.join(info.pkgDir, "src", "index.html");
            const indexResult = await generateIndexHtml({
              indexPath,
              metafile: result.metafile,
              outdir,
              baseHref: basePath,
              mode: "dev",
              entryNames,
              postTransform: hmrPostTransform,
            });
            fs.writeFileSync(path.join(outdir, "index.html"), indexResult.content);
          }

          // HMR 메시지 디스패치
          if (hmrService != null && result.metafile != null && !isInitialBuild) {
            hmrService.onBuildEnd(result.metafile);
          }

          // build 이벤트 전송
          const success = result.errors.length === 0;
          if (!isInitialBuild) {
            sender.send("build", {
              success,
              errors:
                result.errors.length > 0
                  ? result.errors.map((e) => e.text)
                  : undefined,
              warnings:
                result.warnings.length > 0
                  ? result.warnings.map((w) => w.text)
                  : undefined,
            });
          }

          // 초기 빌드 완료 시 resolve
          if (isInitialBuild) {
            isInitialBuild = false;
            initialBuildResolve?.({
              success,
              errors:
                result.errors.length > 0
                  ? result.errors.map((e) => e.text)
                  : undefined,
            });
          }
        } catch (err) {
          const message = errNs.message(err);
          sender.send("error", { message });
          if (isInitialBuild) {
            isInitialBuild = false;
            initialBuildResolve?.({ success: false, errors: [message] });
          }
        }
      },
    });

    // 5. HTTP dev server 생성
    const httpDevServer = createDevHttpServer({
      distDir: outdir,
      basePath,
      port: info.port ?? 0,
      onRequest: (req, res) => hmrService?.handleRequest(req, res) ?? false,
    });
    devServer = httpDevServer;

    // 6. HMR WebSocket 서비스 생성
    hmrService = createHmrService({
      httpServer: httpDevServer.httpServer,
      basePath,
      templateUpdates,
      outDir: outdir,
    });

    // 7. esbuild watch 시작 + 초기 빌드 대기
    await esbuildResult.context.watch();

    const initialResult = await new Promise<ClientBuildResult>((resolve) => {
      initialBuildResolve = resolve;
    });

    // 8. HTTP 서버 시작
    const actualPort = await httpDevServer.listen();

    // 9. serverReady 이벤트 전송
    sender.send("serverReady", { port: actualPort });

    // 10. .config.json + .dev-port 기록
    writeConfigJson(outdir, info.configs);
    fs.writeFileSync(path.join(outdir, ".dev-port"), String(actualPort));

    return initialResult;
  } catch (err) {
    const message = errNs.message(err);
    sender.send("error", { message });
    return { success: false, errors: [message] };
  }
}

/**
 * dev watch 중지
 */
async function stopWatch(): Promise<void> {
  logger.debug("esbuild watch 정리 시작");

  // 1. esbuild context dispose
  if (esbuildResult != null) {
    await esbuildResult.context.dispose();
    esbuildResult = undefined;
  }

  // 2. HMR 서비스 종료
  if (hmrService != null) {
    hmrService.close();
    hmrService = undefined;
  }

  // 3. HTTP 서버 종료
  if (devServer != null) {
    await devServer.close();
    devServer = undefined;
  }

  // 4. public/ 감시 종료
  if (publicWatcher != null) {
    await publicWatcher.close();
    publicWatcher = undefined;
  }

  logger.debug("esbuild watch 정리 완료");
}

/** .config.json 생성 */
function writeConfigJson(
  distDir: string,
  configs?: Record<string, unknown>,
): void {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, ".config.json"),
    JSON.stringify(configs ?? {}, undefined, 2),
  );
}

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
