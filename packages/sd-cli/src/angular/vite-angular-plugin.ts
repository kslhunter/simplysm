import type { Plugin, ModuleNode, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import { JavaScriptTransformer } from "@angular/build/private";
import { createHash } from "crypto";
import fsp from "fs/promises";
import fs from "fs";
import os from "os";
import path from "path";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { AngularSourceFileCache } from "../utils/angular-compiler.js";
import { getPackageSourceFiles } from "../utils/tsconfig.js";
import {
  AngularBuildPipeline,
  type PipelineDiagnosticResult,
} from "../utils/angular-build-pipeline.js";
import { loadSdConfig } from "../utils/sd-config.js";
import type { SdConfig, SdPackageConfig } from "../sd-config.types.js";
import { resolveReplaceDepEntries } from "../utils/replace-deps.js";

const logger = consola.withTag("sd:cli:angular");

/** sdAngularPlugin 옵션 */
export interface SdAngularPluginOptions {
  /** sd.config.ts packages 키 (패키지 디렉토리명) */
  pkg: string;
  /** rebuild 시작 콜백 (CLI 상태 보고용) */
  onBuildStart?: () => void;
  /** rebuild 완료 콜백 (CLI 상태 보고용) */
  onBuild?: (result: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
  }) => void;
}

/**
 * Angular AOT 컴파일을 수행하는 Vite 플러그인.
 *
 * AngularBuildPipeline + JavaScriptTransformer를 관리한다.
 * - buildStart: Pipeline 초기화 + 컴파일 + emit
 * - transform: .ts 파일에 대해 컴파일된 JS 반환 + JavaScriptTransformer 적용
 * - handleHotUpdate: incremental rebuild + HMR
 * - buildEnd: 리소스 정리
 */
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin {
  let pipeline: AngularBuildPipeline | undefined;
  let sourceFileCache: AngularSourceFileCache | undefined;
  let jsTransformer: JavaScriptTransformer | undefined;
  let prebundleTransformer: JavaScriptTransformer | undefined;

  const templateUpdates = new Map<string, string>();
  let devServer: ViteDevServer | undefined;

  // HMR 배칭: 짧은 시간 내 도착하는 다수의 handleHotUpdate를 모아 한 번에 처리
  const pendingHmrFiles = new Set<string>();
  let hmrBatchTimer: ReturnType<typeof setTimeout> | undefined;

  /** Rolldown watch 모드에서 변경된 파일 경로를 수집한다. buildStart 재호출 시 캐시 무효화에 사용. */
  const pendingWatchChanges = new Set<string>();

  // sd.config.ts에서 로딩된 설정 (config() 훅에서 초기화)
  let isDev = false;
  let enableSourcemap = false;
  let isDevServer = false;
  let sdConfig: SdConfig | undefined;
  let pkgConfig: SdPackageConfig | undefined;
  let resolvedPkgDir: string | undefined;
  let replaceDepDistPaths: string[] | undefined;

  function createJsTransformer(): JavaScriptTransformer {
    const maxThreads = Math.max(1, Math.floor((os.cpus().length * 2) / 3));
    return new JavaScriptTransformer(
      {
        sourcemap: enableSourcemap,
        thirdPartySourcemaps: enableSourcemap,
        advancedOptimizations: !isDev,
        jit: false,
      },
      maxThreads,
    );
  }

  /**
   * sd.config.ts의 replaceDeps glob에서 node_modules 패키지의 dist 경로를 계산한다.
   */
  function resolveReplaceDeps(pkgDir: string, config: SdConfig): string[] | undefined {
    if (config.replaceDeps == null) return undefined;

    // node_modules 하위 패키지명 수집
    const nodeModulesDir = path.join(pkgDir, "node_modules");
    const targetNames: string[] = [];
    try {
      for (const entry of fs.readdirSync(nodeModulesDir)) {
        if (entry.startsWith(".")) continue;
        if (entry.startsWith("@")) {
          // scoped package
          const scopeDir = path.join(nodeModulesDir, entry);
          for (const subEntry of fs.readdirSync(scopeDir)) {
            targetNames.push(`${entry}/${subEntry}`);
          }
        } else {
          targetNames.push(entry);
        }
      }
    } catch {
      // node_modules 없으면 빈 배열
      return undefined;
    }

    const matched = resolveReplaceDepEntries(config.replaceDeps, targetNames);
    if (matched.length === 0) return undefined;

    const distPaths: string[] = [];
    for (const dep of matched) {
      const distDir = path.join(nodeModulesDir, ...dep.targetName.split("/"), "dist");
      try {
        distPaths.push(pathx.posix(fs.realpathSync(distDir)));
      } catch {
        distPaths.push(pathx.posix(distDir));
      }
    }
    return distPaths;
  }

  /**
   * 배칭된 HMR 파일을 한 번에 처리한다.
   * 여러 handleHotUpdate 호출에서 수집된 파일을 단일 pipeline.update()로 처리하고,
   * full-reload를 전송한다.
   */
  async function processHmrBatch(server: ViteDevServer): Promise<void> {
    if (pipeline == null || pendingHmrFiles.size === 0) return;

    const filesToUpdate = [...pendingHmrFiles];
    pendingHmrFiles.clear();

    logger.debug(`HMR 배치 처리 시작 (${filesToUpdate.length}개 파일)`);

    options.onBuildStart?.();

    try {
      templateUpdates.clear();

      const pipelineResult = await pipeline.update(filesToUpdate);

      if (pipelineResult.templateUpdates != null) {
        for (const [key, value] of pipelineResult.templateUpdates) {
          templateUpdates.set(key, value);
        }
      }

      reportDiagnostics(pipelineResult.diagnostics);

      options.onBuild?.({
        success: pipelineResult.diagnostics.errors.length === 0,
        errors: pipelineResult.diagnostics.errors.map((e) => e.message),
        warnings: pipelineResult.diagnostics.warnings.map((w) => w.message),
      });

      // 영향받은 모듈을 Vite HMR으로 전달
      const affectedPaths = pipeline.getLatestEmittedSourcePaths();
      const updates: Array<{ type: "js-update"; path: string; acceptedPath: string; timestamp: number }> = [];
      const timestamp = Date.now();
      for (const p of affectedPaths) {
        const mods = server.moduleGraph.getModulesByFile(p);
        if (mods) {
          for (const mod of mods) {
            server.moduleGraph.invalidateModule(mod);
            updates.push({
              type: "js-update",
              path: mod.url,
              acceptedPath: mod.url,
              timestamp,
            });
          }
        }
      }

      if (updates.length > 0) {
        server.hot.send({ type: "update", updates });
      } else {
        server.hot.send({ type: "full-reload" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`HMR batch recompile failed: ${message}`);
      options.onBuild?.({ success: false, errors: [message] });
    }
  }

  return {
    name: "sd-angular",
    enforce: "pre",

    watchChange(id: string) {
      pendingWatchChanges.add(pathx.posix(id));
    },

    async config(_config: unknown, env: { mode: string }) {
      const cwd = process.cwd();
      isDev = env.mode === "development";

      // sd.config.ts 로딩
      sdConfig = await loadSdConfig({ cwd, dev: isDev, opt: [] });
      const rawPkgConfig = sdConfig.packages[options.pkg];
      if (rawPkgConfig == null) {
        throw new Error(`sd.config.ts에 패키지 "${options.pkg}"가 정의되어 있지 않습니다.`);
      }
      pkgConfig = rawPkgConfig;

      // 패키지 디렉토리 resolve
      resolvedPkgDir = path.resolve(cwd, "packages", options.pkg);

      // browserSupport (client 패키지에만 존재)
      const browserSupport = pkgConfig.target === "client"
        ? (pkgConfig).browserSupport
        : undefined;

      // legacyModule
      const legacyModule = browserSupport?.legacyModule === true;

      // replaceDepDistPaths 계산
      replaceDepDistPaths = resolveReplaceDeps(resolvedPkgDir, sdConfig);

      // Linker 캐시 디렉토리 (기본값)
      // enableSourcemap은 아직 확정되지 않으므로 isDev로 임시 결정
      const linkerCacheDir = path.join(cwd, ".cache", "linker", isDev ? "sm" : "nosm");

      return {
        define: {
          ngDevMode: isDev ? undefined : "false",
          ngJitMode: "false",
          ngHmrMode: isDev && !legacyModule ? undefined : "false",
        },
        optimizeDeps: {
          esbuildOptions: {
            plugins: [
              {
                name: "angular-vite-optimize-deps",
                setup(build: { onLoad: Function }) {
                  build.onLoad(
                    { filter: /\.[cm]?js$/ },
                    async (args: { path: string }) => {
                      if (!/\.[cm]?js$/.test(args.path)) return null;

                      // replaceDeps 파일은 Linker 캐시를 건너뛴다 (항상 fresh 처리)
                      if (
                        replaceDepDistPaths != null &&
                        replaceDepDistPaths.some((p) =>
                          pathx.posix(args.path).startsWith(p),
                        )
                      ) {
                        return null;
                      }

                      if (prebundleTransformer == null) return null;

                      const content = await fsp.readFile(args.path, "utf-8");
                      const hash = createHash("sha256").update(content).digest("hex");
                      const cachePath = path.join(linkerCacheDir, `${hash}.js`);

                      try {
                        const cached = await fsp.readFile(cachePath, "utf-8");
                        return { contents: cached, loader: "js" as const };
                      } catch {
                        // cache miss
                      }

                      const result = await prebundleTransformer.transformFile(args.path);
                      const resultStr =
                        typeof result === "string"
                          ? result
                          : new TextDecoder().decode(result);

                      try {
                        await fsp.mkdir(linkerCacheDir, { recursive: true });
                        await fsp.writeFile(cachePath, resultStr);
                      } catch {
                        // cache write failure — non-fatal
                      }

                      return { contents: resultStr, loader: "js" as const };
                    },
                  );
                },
              },
            ],
          },
        },
      };
    },

    configResolved(resolved: { build: { sourcemap: unknown } }) {
      enableSourcemap = resolved.build.sourcemap !== false || isDev;

      // Transformer 생성 (sourcemap 확정 후)
      prebundleTransformer = new JavaScriptTransformer(
        { sourcemap: enableSourcemap, jit: false, thirdPartySourcemaps: enableSourcemap },
        1,
      );
    },

    async buildStart() {
      if (resolvedPkgDir == null) {
        throw new Error("config() 훅이 먼저 호출되어야 합니다.");
      }
      logger.debug("sdAngularPlugin buildStart 시작");

      // tsconfig 로드
      const tsconfigPath = path.join(resolvedPkgDir, "tsconfig.json");
      const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, resolvedPkgDir);
      logger.debug(`tsconfig 파싱 완료: ${parsed.fileNames.length}개 파일`);

      // AngularSourceFileCache 생성 (또는 재사용)
      sourceFileCache ??= new AngularSourceFileCache();

      // Rolldown watch 재빌드: 변경된 파일의 캐시 무효화
      let hadPendingChanges = false;
      if (pendingWatchChanges.size > 0) {
        hadPendingChanges = true;
        logger.debug(`watch 변경 파일 ${pendingWatchChanges.size}개 캐시 무효화`);
        sourceFileCache.invalidate(pendingWatchChanges);
        pendingWatchChanges.clear();
      }

      // legacyModule, postCssPlugins from sd.config.ts (client 패키지에만 존재)
      const browserSupport = pkgConfig?.target === "client"
        ? (pkgConfig).browserSupport
        : undefined;
      const legacyModule = browserSupport?.legacyModule === true;
      const postCssPlugins = browserSupport?.postCss?.plugins;

      // Pipeline 생성 (최초) 또는 재사용
      pipeline ??= new AngularBuildPipeline({
        mode: "client",
        pkgDir: resolvedPkgDir,
        cwd: process.cwd(),
        rootNames: getPackageSourceFiles(resolvedPkgDir, parsed),
        compilerOptions: parsed.options,
        angularCompilerOptions: parsed.raw?.angularCompilerOptions as
          | Record<string, unknown>
          | undefined,
        sourceFileCache,
        enableHmr: isDevServer && !legacyModule,
        compilerOptionsTransformer: (opts) => ({
          ...opts,
          noEmit: false,
          declaration: false,
          declarationMap: false,
          rootDir: process.cwd(),
          ...(isDev ? { removeComments: false } : {}),
        }),
        postCssPlugins,
        scssCacheDir: path.join(resolvedPkgDir, ".cache", "scss"),
      });

      // JavaScriptTransformer 생성
      jsTransformer ??= createJsTransformer();

      // Pipeline 초기화 — 이미 초기화됐고 변경 파일이 없으면 건너뜀
      if (pipeline.getEmittedFiles().size > 0 && !hadPendingChanges) {
        logger.debug("Pipeline 이미 초기화됨, 변경 없음 — buildStart 건너뜀");
        return;
      }
      const pipelineResult = await pipeline.initialize();

      // templateUpdates 수집
      templateUpdates.clear();
      if (pipelineResult.templateUpdates != null) {
        for (const [key, value] of pipelineResult.templateUpdates) {
          templateUpdates.set(key, value);
        }
      }

      // 진단 보고
      reportDiagnostics(pipelineResult.diagnostics);

      // SCSS 에러 보고
      for (const err of pipelineResult.scssErrors) {
        logger.error(err);
      }

      // 초기 빌드 결과 보고 (dev, prod 공통)
      options.onBuild?.({
        success: pipelineResult.diagnostics.errors.length === 0,
        errors: pipelineResult.diagnostics.errors.map((e) => e.message),
        warnings: pipelineResult.diagnostics.warnings.map((w) => w.message),
      });
    },

    handleHotUpdate({
      file,
      modules: _modules,
      server,
    }: {
      file: string;
      modules: ModuleNode[];
      server: ViteDevServer;
      timestamp: number;
      read: () => string | Promise<string>;
    }): ModuleNode[] | void {
      if (pipeline == null || !isDev) return;
      if (
        !file.endsWith(".ts") &&
        !file.endsWith(".html") &&
        !file.endsWith(".scss")
      ) {
        // replaceDeps .js 파일 변경 시 full-reload 강제
        // (pnpm strict isolation에서 exclude 불가 → pre-bundle 필수 → HMR 불가)
        if (
          file.endsWith(".js") &&
          devServer != null &&
          replaceDepDistPaths != null &&
          replaceDepDistPaths.some((p) =>
            pathx.posix(file).startsWith(p),
          )
        ) {
          devServer.hot.send({ type: "full-reload" });
          return [];
        }
        return;
      }

      const normalizedFile = pathx.posix(file);

      if (file.endsWith(".scss")) {
        // SCSS @use 의존성 역방향 탐색: 변경된 SCSS를 @use하는 파일을 찾아 재컴파일
        const affectedOwnerFiles = pipeline.findAffectedByScss(normalizedFile);
        if (affectedOwnerFiles.length === 0) return;
        for (const f of affectedOwnerFiles) {
          pendingHmrFiles.add(f);
        }
      } else {
        // 의존성 필터: TypeScript program에 포함되지 않은 파일은 건너뜀
        const programFiles = pipeline.getTsProgram().getSourceFiles();
        const isInProgram = programFiles.some(
          (sf) => pathx.posix(sf.fileName) === normalizedFile,
        );
        if (!isInProgram) {
          logger.debug(`변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀: ${normalizedFile}`);
          return;
        }
        pendingHmrFiles.add(file);
      }

      // 배칭: 짧은 시간 내 도착하는 파일을 모아 한 번에 처리
      if (hmrBatchTimer != null) clearTimeout(hmrBatchTimer);
      hmrBatchTimer = setTimeout(() => {
        hmrBatchTimer = undefined;
        void processHmrBatch(server);
      }, 100);

      // Vite의 개별 HMR 처리를 억제 (배치 처리 후 full-reload로 대체)
      return [];
    },

    async transform(_code, id) {
      if (jsTransformer == null) return;

      // query param 제거 (excluded deps는 ?v=xxx 포함 가능)
      const cleanId = id.split("?")[0];
      let code = _code;

      // Phase 1: TS 컴파일 — .ts 파일은 Pipeline이 emit한 JS로 교체
      if (cleanId.endsWith(".ts")) {
        const normalizedId = pathx.posix(cleanId);
        const emittedContent = pipeline?.getEmittedFile(normalizedId);
        if (emittedContent == null) return;
        code = emittedContent;
      } else if (!cleanId.endsWith(".mjs") && !cleanId.endsWith(".js")) {
        return;
      }

      // Phase 2: JS 변환 — Angular Linker로 partial → full AOT 링킹 + 최적화
      const transformed = await jsTransformer.transformData(pathx.posix(cleanId), code, false);
      const transformedCode = new TextDecoder().decode(transformed);

      // 인라인 소스맵 분리 (Rollup 경고 방지)
      const inlineMapMatch = transformedCode.match(
        /\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,(.+)$/m,
      );
      if (inlineMapMatch != null) {
        const mapJson = atob(inlineMapMatch[1]);
        return {
          code: transformedCode.slice(0, inlineMapMatch.index),
          map: JSON.parse(mapJson),
        };
      }
      return { code: transformedCode, map: null };
    },

    async buildEnd() {
      // dev 모드에서는 pipeline/jsTransformer를 유지 (HMR용 incremental compilation)
      if (!isDev) {
        if (jsTransformer != null) {
          await jsTransformer.close();
          jsTransformer = undefined;
        }
        if (prebundleTransformer != null) {
          await prebundleTransformer.close();
        }
        pipeline = undefined;
      }
    },

    configureServer(server: ViteDevServer) {
      devServer = server;
      isDevServer = true;

      // component-middleware 등록 (HMR template updates 서빙)
      server.middlewares.use(angularComponentMiddleware(templateUpdates, server.config.base));

      // dev server 종료 시 리소스 정리
      server.httpServer?.on("close", () => {
        void Promise.all([
          jsTransformer?.close(),
          prebundleTransformer?.close(),
        ])
          .catch((err: unknown) => {
            logger.error(
              `Resource dispose failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          })
          .finally(() => {
            jsTransformer = undefined;
            pipeline = undefined;
          });
      });
    },
  };
}

function angularComponentMiddleware(
  templateUpdates: Map<string, string>,
  basePath: string,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  return (req, res, next) => {
    const rawUrl = req.url ?? "";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const strippedPathname =
      basePath !== "/" && pathname.startsWith(basePath)
        ? pathname.slice(basePath.length - 1)
        : pathname;
    if (!strippedPathname.includes("/@ng/component")) {
      next();
      return;
    }

    const componentId = parsedUrl.searchParams.get("c") ?? "";
    const body = templateUpdates.get(encodeURIComponent(componentId)) ?? "";

    res.writeHead(200, {
      "Content-Type": "text/javascript",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  };
}

function reportDiagnostics(diagnostics: PipelineDiagnosticResult): void {
  for (const error of diagnostics.errors) {
    const loc =
      error.file != null
        ? `${error.file}${error.line != null ? `:${String(error.line)}` : ""}`
        : "";
    logger.error(`${loc !== "" ? `(${loc}) ` : ""}${error.message}`);
  }
  for (const warning of diagnostics.warnings) {
    const loc =
      warning.file != null
        ? `${warning.file}${warning.line != null ? `:${String(warning.line)}` : ""}`
        : "";
    logger.warn(`${loc !== "" ? `(${loc}) ` : ""}${warning.message}`);
  }
}
