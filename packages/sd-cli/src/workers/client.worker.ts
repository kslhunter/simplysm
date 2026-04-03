import { createServer, build as viteBuild, type ViteDevServer } from "vite";
import path from "path";
import fs from "node:fs";
import http from "node:http";
import mime from "mime";
import { createWorker } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import { registerCleanupHandlers, setupWorkerConsola } from "../utils/worker-utils.js";
import { createClientViteConfig } from "../utils/vite-config.js";
import type { ScopeWatchReplaceDep } from "../utils/vite-scope-watch-plugin.js";
import type { SdBrowserSupportConfig, SdPwaConfig } from "../sd-config.types.js";
import type { LintWithProgramResult } from "../utils/lint-with-program.js";

setupWorkerConsola();

//#region Types

/** Client 빌드 입력 정보 */
export interface ClientBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 클라이언트 프레임워크 선택 */
  framework?: "angular" | "solid";
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
  /** 컴파일의 ts.Program을 사용하여 lint 실행 */
  enableLint?: boolean;
  /** Vite optimizeDeps.exclude에 전달할 패키지 목록 */
  exclude?: string[];
  /** 빌드 출력 경로 (미설정 시 pkgDir/dist) */
  outDir?: string;
  /** Vite base 경로 (미설정 시 /{pkgName}/) */
  base?: string;
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

/** viteBuild({ build: { watch: {} } }) 반환 타입의 최소 인터페이스 */
interface WatcherHandle {
  on(event: string, handler: (event: { code: string; error?: { message: string } }) => void): void;
  close(): Promise<void>;
}

let viteServer: ViteDevServer | undefined;
let rollupWatcher: WatcherHandle | undefined;
let legacyHttpServer: http.Server | undefined;

/** SSE 연결된 클라이언트 목록 (live reload용) */
const sseClients = new Set<http.ServerResponse>();

/** SSE 연결된 모든 클라이언트에 reload 신호를 전송한다 */
function notifyLiveReload(): void {
  for (const client of sseClients) {
    client.write("data: reload\n\n");
  }
}


/** live reload 클라이언트 스크립트 (HTML에 주입) */
const LIVE_RELOAD_SCRIPT = `<script>(function(){var s=new EventSource("__live-reload");s.onmessage=function(){location.reload();};})()</script>`;

/**
 * HTML 응답 시 live reload 스크립트를 </body> 직전에 주입한다.
 */
function injectLiveReloadScript(html: string): string {
  const idx = html.lastIndexOf("</body>");
  if (idx !== -1) {
    return html.slice(0, idx) + LIVE_RELOAD_SCRIPT + html.slice(idx);
  }
  return html + LIVE_RELOAD_SCRIPT;
}

/**
 * legacy dev 모드용 HTTP 정적 파일 서버를 생성한다.
 * dist/ 디렉토리의 파일을 서빙하고, SPA fallback + SSE live reload를 지원한다.
 */
function createLegacyHttpServer(distDir: string, basePath: string): http.Server {
  return http.createServer((req, res) => {
    const url = (req.url ?? "/").split("?")[0];

    // basePath prefix 제거
    let relativePath: string;
    if (url.startsWith(basePath)) {
      relativePath = url.slice(basePath.length);
    } else {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    // SSE live reload 엔드포인트
    if (relativePath === "__live-reload" || relativePath === "/__live-reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      sseClients.add(res);
      req.on("close", () => {
        sseClients.delete(res);
      });
      return;
    }

    // 빈 경로 또는 / → index.html
    if (relativePath === "" || relativePath === "/") {
      relativePath = "index.html";
    }

    // 선행 슬래시 제거
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }

    const filePath = path.join(distDir, relativePath);
    const ext = path.extname(filePath);

    // 파일 존재 확인
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const contentType = mime.getType(ext) ?? "application/octet-stream";
      if (ext === ".html") {
        // HTML: live reload 스크립트 주입
        const content = injectLiveReloadScript(fs.readFileSync(filePath, "utf-8"));
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } else {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      }
    } else {
      // SPA fallback: index.html 반환 (live reload 스크립트 주입)
      const indexPath = path.join(distDir, "index.html");
      if (fs.existsSync(indexPath)) {
        const content = injectLiveReloadScript(fs.readFileSync(indexPath, "utf-8"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    }
  });
}

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
  if (info.browserSupport?.legacyModule === true) {
    return startLegacyWatch(info);
  }
  logger.debug(`[${info.name}] client worker startWatch 시작 (port: ${info.port ?? "auto"})`);
  try {
    const { tsconfigPath, pkgName } = resolvePackageInfo(info);

    // polyfills.ts 자동 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fs.existsSync(polyfillsPath) ? ["./src/polyfills.ts"] : undefined;

    const viteConfig = await createClientViteConfig({
      framework: info.framework,
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
      exclude: info.exclude,
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
    writeConfigJson(path.join(info.pkgDir, "dist"), info.configs);

    return { success: true };
  } catch (err) {
    const message = errNs.message(err);
    sender.send("error", { message });
    return { success: false, errors: [message] };
  }
}

/**
 * legacy watch 시작. Vite build --watch로 파일 변경을 감시한다.
 * legacyModule: true일 때 createServer 대신 사용한다.
 */
async function startLegacyWatch(info: ClientBuildInfo): Promise<ClientBuildResult> {
  logger.debug(`[${info.name}] client worker startLegacyWatch 시작`);
  try {
    const { tsconfigPath, pkgName } = resolvePackageInfo(info);

    // dist 초기화 (첫 빌드만 비움)
    const distDir = path.join(info.pkgDir, "dist");
    fs.rmSync(distDir, { recursive: true, force: true });

    // polyfills.ts 자동 감지
    const polyfillsPath = path.join(info.pkgDir, "src", "polyfills.ts");
    const polyfills = fs.existsSync(polyfillsPath) ? ["./src/polyfills.ts"] : undefined;

    const viteConfig = await createClientViteConfig({
      framework: info.framework,
      pkgDir: info.pkgDir,
      pkgName,
      mode: "dev",
      tsconfigPath,
      serverPort: 0,
      env: info.env,
      watch: true,
      onBuildStart: () => sender.send("buildStart", {}),
      onBuild: (result) => sender.send("build", result),
      enableLint: info.enableLint,
      replaceDeps: info.replaceDeps,
      onScopeRebuild: () => sender.send("scopeRebuild", {}),
      browserslist: info.browserSupport?.browserslist,
      postCssPlugins: info.browserSupport?.postCss?.plugins,
      legacyModule: info.browserSupport?.legacyModule,
      polyfills,
      pwa: false,
      exclude: info.exclude,
    });

    const watcher = (await viteBuild(viteConfig)) as WatcherHandle;
    rollupWatcher = watcher;

    // .config.json 생성
    writeConfigJson(path.join(info.pkgDir, "dist"), info.configs);

    // HTTP 정적 파일 서버 시작
    const name = pkgName.replace(/^@[^/]+\//, "");
    const basePath = `/${name}/`;
    const httpServer = createLegacyHttpServer(distDir, basePath);
    legacyHttpServer = httpServer;

    const serverPort = await new Promise<number>((resolve, reject) => {
      httpServer.listen(info.port ?? 0, "0.0.0.0", () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr != null) {
          resolve(addr.port);
        } else {
          reject(new Error("HTTP 서버 포트를 감지할 수 없습니다."));
        }
      });
      httpServer.on("error", reject);
    });

    sender.send("serverReady", { port: serverPort });

    // 첫 빌드 완료 대기
    return await new Promise<ClientBuildResult>((resolve) => {
      let firstBuildResolved = false;

      watcher.on("event", (event: { code: string; error?: { message: string } }) => {
        if (event.code === "END") {
          if (!firstBuildResolved) {
            firstBuildResolved = true;
            resolve({ success: true });
          } else {
            // 재빌드 완료 → 브라우저 live reload
            notifyLiveReload();
          }
        } else if (event.code === "ERROR") {
          const message = event.error?.message ?? "Unknown build error";
          sender.send("error", { message });
          if (!firstBuildResolved) {
            firstBuildResolved = true;
            resolve({ success: false, errors: [message] });
          }
        }
      });
    });
  } catch (err) {
    const message = errNs.message(err);
    sender.send("error", { message });
    return { success: false, errors: [message] };
  }
}

/**
 * dev server 중지. Vite server 또는 RollupWatcher를 정리한다.
 */
async function stopWatch(): Promise<void> {
  logger.debug("Vite server 정리 시작");

  const watcherToClose = rollupWatcher;
  rollupWatcher = undefined;
  if (watcherToClose != null) {
    await watcherToClose.close();
  }

  // SSE 클라이언트 정리
  for (const client of sseClients) {
    client.end();
  }
  sseClients.clear();

  const httpServerToClose = legacyHttpServer;
  legacyHttpServer = undefined;
  if (httpServerToClose != null) {
    await new Promise<void>((resolve, reject) => {
      httpServerToClose.close((err) => {
        if (err != null) reject(err);
        else resolve();
      });
    });
  }

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
      framework: info.framework,
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
      exclude: info.exclude,
      outDir: info.outDir,
      base: info.base,
    });

    await viteBuild(viteConfig);

    // .config.json 생성 (항상 dist/에 기록 — outDir과 무관)
    writeConfigJson(path.join(info.pkgDir, "dist"), info.configs);

    logger.debug(`[${info.name}] client worker build 완료`);
    return { success: true, lint: lintResult };
  } catch (err) {
    const message = errNs.message(err);
    logger.debug(`[${info.name}] client worker build 예외: ${message}`);
    return { success: false, errors: [message] };
  }
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
