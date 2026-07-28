import path from "path";
import { createWorker, FsWatcher, fsx, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { setupWorkerLifecycle } from "./shared-worker-lifecycle";
import {
  createClientEsbuildContext,
  type ClientEsbuildResult,
} from "../esbuild/esbuild-client-config";
import { generateIndexHtml } from "../esbuild/esbuild-index-html";
import { formatEsbuildMessages } from "../utils/output-utils";
import { applyPwa, createPwaHtmlTransform } from "../esbuild/esbuild-pwa";
import { createDevHttpServer, type DevHttpServer } from "../dev-server/dev-http-server";
import { createHmrService, type HmrService } from "../dev-server/hmr-service";
import { createHmrPostTransform } from "../dev-server/hmr-client-script";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";
import { extractLicenses, LICENSE_NOTICE_FILE_NAME } from "../utils/license-extractor";
import { buildSsrBundle } from "../esbuild/esbuild-ssr-config";
import { prerenderRoutes } from "../ssg/prerender";
import type { SdBrowserSupportConfig, SdPwaConfig } from "../sd-config.types";
import type esbuild from "esbuild";
import type { PartialMessage } from "esbuild";
import { IncrementalMtimeTracker } from "./incremental-mtime-tracker";

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
  /** SSG(빌드 타임 프리렌더) 라우트 목록. 지정 시 프로덕션 빌드에서만 적용 */
  prerender?: string[];
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
  error: { message: string; stack?: string };
}

//#endregion

//#region Worker

let esbuildResult: ClientEsbuildResult | undefined;
let devServer: DevHttpServer | undefined;
let hmrService: HmrService | undefined;
let publicWatcher: FsWatcher | undefined;
let indexHtmlWatcher: FsWatcher | undefined;
let lastMetafile: esbuild.Metafile | undefined;
let isInitialBuild = true;
let initialBuildResolve: ((result: ClientBuildResult) => void) | undefined;

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
  const pkgName = fsx.readJsonSync<{ name: string }>(pkgJsonPath).name;
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
    const { pkgName, legacyModule, browserslist, postcssPlugins } = resolvePackageInfo(info);

    const outdir = info.outDir ?? path.join(info.pkgDir, "dist");

    // 1. public/ 복사
    await copyPublicFiles(info.pkgDir, false, outdir);

    // 2. polyfills 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fsx.existsSync(polyfillsPath) ? ["src/polyfills.ts"] : undefined;

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

    const pwaHtmlTransform = info.pwa !== false ? createPwaHtmlTransform() : undefined;

    const indexResult = await generateIndexHtml({
      indexPath,
      metafile: result.metafile!,
      outdir,
      baseHref: basePath,
      mode: "build",
      entryNames,
      postTransform: pwaHtmlTransform,
    });

    fsx.writeSync(path.join(outdir, "index.html"), indexResult.content);

    // 5.5. SSG 프리렌더 (opt-in — prerender 설정이 있을 때만)
    if (info.prerender != null && info.prerender.length > 0 && indexResult.errors.length === 0) {
      // SPA 셸 별도 보존 (비프리렌더 라우트 딥링크 폴백용 — 서버 정적 핸들러가 사용)
      fsx.writeSync(path.join(outdir, "index.csr.html"), indexResult.content);

      const { bundlePath } = await buildSsrBundle({
        pkgDir: info.pkgDir,
        cwd: info.cwd,
        env: info.env,
        postcssPlugins: info.browserSupport?.postCss?.plugins,
      });

      // 라우트별 HTML 생성 ("/"는 index.html을 프리렌더 결과로 대체)
      await prerenderRoutes({
        bundlePath,
        routes: info.prerender,
        documentHtml: indexResult.content,
        basePath,
        outdir,
      });
    }

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

    // 8. .config.json + 제3자 라이선스 고지 기록
    writeConfigJson(outdir, info.configs);
    fsx.writeSync(
      path.join(outdir, LICENSE_NOTICE_FILE_NAME),
      await extractLicenses(result.metafile!, process.cwd()),
    );

    logger.debug(`[${info.name}] client worker build 완료`);
    return {
      success: indexResult.errors.length === 0,
      errors: indexResult.errors.length > 0 ? indexResult.errors : undefined,
      warnings: indexResult.warnings.length > 0 ? indexResult.warnings : undefined,
    };
  } catch (err) {
    const errors: string[] = [];
    if (err != null && typeof err === "object" && "errors" in err) {
      const buildErrors = (err as { errors: PartialMessage[] }).errors;
      errors.push(...formatEsbuildMessages(buildErrors, "error"));
    }
    if (errors.length === 0) {
      errors.push(errNs.message(err));
    }
    logger.debug(`[${info.name}] client worker build 예외: ${errors.join("\n")}`);
    logger.debug(`[${info.name}] client worker build 예외 스택:\n${errNs.stack(err)}`);
    return { success: false, errors };
  }
}

/**
 * sourceFileCache 무효화 + mtime 추적 플러그인 생성
 */
function createSourceFileCachePlugin(): esbuild.Plugin {
  return {
    name: "sd-build-start",
    setup(pluginBuild: esbuild.PluginBuild) {
      const mtimeTracker = new IncrementalMtimeTracker();

      pluginBuild.onStart(() => {
        // sourceFileCache 무효화: 변경된 파일의 loadResultCache + TypeScript 소스 캐시 모두 제거
        if (esbuildResult != null) {
          const { loadResultCache, typeScriptFileCache } = esbuildResult.sourceFileCache;
          // JS 파일 (loadResultCache) + TS 파일 (typeScriptFileCache) 모두 감시
          const watchTargets = [...loadResultCache.watchFiles, ...typeScriptFileCache.keys()];
          const changedFiles = mtimeTracker.detectChanges(watchTargets);
          const normalizedChangedFiles = new Set<string>();
          for (const file of changedFiles) {
            normalizedChangedFiles.add(pathx.posix(file));
          }
          esbuildResult.sourceFileCache.cycleModifiedFiles = normalizedChangedFiles;
          if (changedFiles.size > 0) {
            esbuildResult.sourceFileCache.invalidate(changedFiles);
          }
        }

        if (!isInitialBuild) {
          sender.send("buildStart", {});
        }
      });

      pluginBuild.onEnd(() => {
        if (esbuildResult == null) return;
        // JS 파일 (loadResultCache) + TS 파일 (typeScriptFileCache) 모두 기록
        const watchTargets = [
          ...esbuildResult.sourceFileCache.loadResultCache.watchFiles,
          ...esbuildResult.sourceFileCache.typeScriptFileCache.keys(),
        ];
        mtimeTracker.updateMtimes(watchTargets);
      });
    },
  };
}

/**
 * dev watch 빌드 완료 핸들러 생성 (index.html 재생성 + HMR + 이벤트 전송)
 */
function createDevBuildEndHandler(
  basePath: string,
  actualPort: number,
  outdir: string,
  entryNames: string[],
  pkgDir: string,
): (result: esbuild.BuildResult) => Promise<void> {
  return async (result: esbuild.BuildResult) => {
    try {
      // index.html 재생성 (lastMetafile 보관 — index.html 단독 변경 시 재생성용)
      if (result.metafile != null) {
        lastMetafile = result.metafile;
        const hmrPostTransform = createHmrPostTransform(basePath, actualPort);
        const indexPath = path.join(pkgDir, "src", "index.html");
        const indexResult = await generateIndexHtml({
          indexPath,
          metafile: result.metafile,
          outdir,
          baseHref: basePath,
          mode: "dev",
          entryNames,
          postTransform: hmrPostTransform,
        });
        fsx.writeSync(path.join(outdir, "index.html"), indexResult.content);
      }

      // HMR 메시지 디스패치
      if (hmrService != null && result.metafile != null && !isInitialBuild) {
        hmrService.onBuildEnd(result.metafile);
      }

      // build 이벤트 전송
      const success = result.errors.length === 0;
      const errors =
        result.errors.length > 0 ? formatEsbuildMessages(result.errors, "error") : undefined;
      const warnings =
        result.warnings.length > 0 ? formatEsbuildMessages(result.warnings, "warning") : undefined;

      if (!isInitialBuild) {
        sender.send("build", { success, errors, warnings });
      }

      // 초기 빌드 완료 시 resolve
      if (isInitialBuild) {
        isInitialBuild = false;
        initialBuildResolve?.({ success, errors, warnings });
      }
    } catch (err) {
      const message = errNs.message(err);
      const stack = errNs.stack(err);
      logger.debug(`client dev build end 예외 스택:\n${stack}`);
      if (!isInitialBuild) {
        sender.send("error", { message, stack });
      } else {
        isInitialBuild = false;
        initialBuildResolve?.({
          success: false,
          errors: [message],
          warnings:
            result.warnings.length > 0
              ? formatEsbuildMessages(result.warnings, "warning")
              : undefined,
        });
      }
    }
  };
}

/**
 * dev watch 시작
 */
async function startWatch(info: ClientBuildInfo): Promise<ClientBuildResult> {
  guardStartWatch();
  const { pkgName, legacyModule, browserslist, postcssPlugins } = resolvePackageInfo(info);

  logger.debug(
    `[${info.name}] client worker startWatch 시작 (port: ${info.port ?? "auto"}, legacy: ${legacyModule})`,
  );

  try {
    const outdir = path.join(info.pkgDir, "dist");
    const name = pkgName.replace(/^@[^/]+\//, "");
    const basePath = info.base ?? `/${name}/`;

    // 1. dist/ 초기화
    fsx.rmSync(outdir);

    // 2. public/ 복사 + 감시
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // 3. polyfills 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fsx.existsSync(polyfillsPath) ? ["src/polyfills.ts"] : undefined;
    const entryNames = ["main", ...(polyfills != null ? ["polyfills"] : [])];

    // 4. templateUpdates Map
    const templateUpdates = new Map<string, string>();

    // 5. HTTP dev server 생성 + 시작 (포트 확정 — HMR 스크립트에 포트 주입 필요)
    const httpDevServer = createDevHttpServer({
      distDir: outdir,
      basePath,
      port: info.port ?? 0,
      onRequest: (req, res) => hmrService?.handleRequest(req, res) ?? false,
    });
    devServer = httpDevServer;
    const actualPort = await httpDevServer.listen();

    // 6. HMR WebSocket 서비스 생성
    hmrService = createHmrService({
      httpServer: httpDevServer.httpServer,
      basePath,
      templateUpdates,
      outDir: outdir,
    });

    // 7. esbuild context 생성
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
      plugins: [createSourceFileCachePlugin()],
      onEnd: createDevBuildEndHandler(basePath, actualPort, outdir, entryNames, info.pkgDir),
    });

    // 8. esbuild watch 시작 + 초기 빌드 대기
    await esbuildResult.context.watch();

    const initialResult = await new Promise<ClientBuildResult>((resolve) => {
      initialBuildResolve = resolve;
    });

    // 9. src/index.html 감시 (esbuild watch는 HTML을 감시하지 않음)
    const indexHtmlSrcPath = path.join(info.pkgDir, "src", "index.html");
    indexHtmlWatcher = await FsWatcher.watch([indexHtmlSrcPath]);
    indexHtmlWatcher.onChange({ delay: 300 }, async () => {
      if (lastMetafile == null) return;
      try {
        sender.send("buildStart", {});
        const hmrPostTransform = createHmrPostTransform(basePath, actualPort);
        const indexResult = await generateIndexHtml({
          indexPath: indexHtmlSrcPath,
          metafile: lastMetafile,
          outdir,
          baseHref: basePath,
          mode: "dev",
          entryNames,
          postTransform: hmrPostTransform,
        });
        fsx.writeSync(path.join(outdir, "index.html"), indexResult.content);
        hmrService?.broadcast({ type: "full-reload" });
        sender.send("build", { success: true });
      } catch (err) {
        sender.send("error", { message: errNs.message(err), stack: errNs.stack(err) });
      }
    });

    // 10. serverReady 이벤트 전송
    sender.send("serverReady", { port: actualPort });

    // 11. .config.json + .dev-port 기록
    writeConfigJson(outdir, info.configs);
    fsx.writeSync(path.join(outdir, ".dev-port"), String(actualPort));

    return initialResult;
  } catch (err) {
    const message = errNs.message(err);
    const stack = errNs.stack(err);
    logger.debug(`[${info.name}] client worker startWatch 예외 스택:\n${stack}`);
    sender.send("error", { message, stack });
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

  // 5. index.html 감시 종료
  if (indexHtmlWatcher != null) {
    await indexHtmlWatcher.close();
    indexHtmlWatcher = undefined;
  }

  // 6. 빌드 세션 상태 리셋
  lastMetafile = undefined;
  isInitialBuild = true;
  initialBuildResolve = undefined;

  logger.debug("esbuild watch 정리 완료");
}

/** .config.json 생성 */
function writeConfigJson(distDir: string, configs?: Record<string, unknown>): void {
  fsx.writeJsonSync(path.join(distDir, ".config.json"), configs ?? {}, { space: 2 });
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
