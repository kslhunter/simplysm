import type { Plugin, ModuleNode, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import { JavaScriptTransformer } from "@angular/build/private";
import { createHash } from "crypto";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import {
  AngularCompiler,
  AngularSourceFileCache,
} from "../utils/angular-compiler.js";
import { getPackageSourceFiles } from "../utils/tsconfig.js";
import { createClientTransformStylesheet } from "./client-transform-stylesheet.js";
import {
  LintWithProgramRunner,
  type LintWithProgramResult,
} from "../utils/lint-with-program.js";
import { isWorkspaceDiagnostic } from "../utils/diagnostic-utils.js";

const logger = consola.withTag("sd:cli:angular");

/** sdAngularPlugin 옵션 */
export interface SdAngularPluginOptions {
  /** tsconfig.json 경로 */
  tsconfig: string;
  /** 개발 모드 (ngDevMode, advancedOptimizations 제어) */
  dev: boolean;
  /** 레거시 모듈 지원 (import.meta 불가로 HMR 비활성화) */
  legacyModule?: boolean;
  /** 소스맵 생성 여부 (dev와 독립적으로 제어) */
  sourcemap?: boolean;
  /** rebuild 시작 콜백 (CLI 상태 보고용) */
  onBuildStart?: () => void;
  /** rebuild 완료 콜백 (CLI 상태 보고용) */
  onBuild?: (result: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    lint?: LintWithProgramResult;
  }) => void;
  /** 컴파일의 ts.Program을 사용하여 lint 실행 */
  enableLint?: boolean;
  /** browserslist 타겟 (정규화된 배열) */
  browserslist?: string[];
  /** PostCSS 플러그인 배열 */
  postCssPlugins?: unknown[];
  /** Linker 캐시 디렉토리 (기본값: {cwd}/.cache/linker/{sm|nosm}) */
  linkerCacheDir?: string;
}

/**
 * SCSS 의존성 역방향 탐색.
 * 변경된 SCSS 파일을 @use하는 owner 파일(TS 또는 SCSS)을 찾는다.
 */
export function findAffectedByScss(
  normalizedScssPath: string,
  scssDependencies: Map<string, Set<string>>,
): string[] {
  const affected: string[] = [];
  for (const [ownerFile, deps] of scssDependencies) {
    if (deps.has(normalizedScssPath)) {
      affected.push(ownerFile);
    }
  }
  return affected;
}

/**
 * Angular AOT 컴파일을 수행하는 Vite 플러그인.
 *
 * AngularCompiler + JavaScriptTransformer를 직접 관리한다.
 * - buildStart: AngularCompiler 초기화 + 컴파일 + emit
 * - transform: .ts 파일에 대해 컴파일된 JS 반환 + JavaScriptTransformer 적용
 * - handleHotUpdate: incremental rebuild + HMR
 * - buildEnd: 리소스 정리
 */
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin {
  let compiler: AngularCompiler | undefined;
  let sourceFileCache: AngularSourceFileCache | undefined;
  let jsTransformer: JavaScriptTransformer | undefined;
  let lintRunner: LintWithProgramRunner | undefined;

  function getOrCreateLintRunner(): LintWithProgramRunner {
    if (lintRunner == null) {
      const pkgDir = path.dirname(options.tsconfig);
      const pkgJsonPath = path.join(pkgDir, "package.json");
      let pkgName = "unknown";
      try {
        const pkgJson = JSON.parse(
          ts.sys.readFile(pkgJsonPath) ?? "{}",
        ) as { name?: string };
        pkgName = pkgJson.name ?? "unknown";
      } catch {
        // 무시
      }
      lintRunner = new LintWithProgramRunner({
        cwd: process.cwd(),
        pkgName,
      });
    }
    return lintRunner;
  }

  const emittedFiles = new Map<string, string>();
  const templateUpdates = new Map<string, string>();
  let hmrLock: Promise<void> = Promise.resolve();
  const scssDependencies = new Map<string, Set<string>>();

  const enableSourcemap = options.sourcemap ?? options.dev;

  // Pre-bundle transformer: optimizeDeps의 esbuild 단계에서 Angular Linker 실행
  const prebundleTransformer = new JavaScriptTransformer(
    { sourcemap: enableSourcemap, jit: false, thirdPartySourcemaps: enableSourcemap },
    1,
  );

  function createJsTransformer(): JavaScriptTransformer {
    const maxThreads = Math.max(1, Math.floor((os.cpus().length * 2) / 3));
    return new JavaScriptTransformer(
      {
        sourcemap: enableSourcemap,
        thirdPartySourcemaps: enableSourcemap,
        advancedOptimizations: !options.dev,
        jit: false,
      },
      maxThreads,
    );
  }

  return {
    name: "sd-angular",
    enforce: "pre",

    config() {
      const linkerCacheDir =
        options.linkerCacheDir ??
        path.join(process.cwd(), ".cache", "linker", enableSourcemap ? "sm" : "nosm");

      return {
        define: {
          ngDevMode: options.dev ? undefined : "false",
          ngJitMode: "false",
          ngHmrMode: options.dev && !options.legacyModule ? undefined : "false",
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

    async buildStart() {
      logger.debug("sdAngularPlugin buildStart 시작");
      // tsconfig 로드
      const configFile = ts.readConfigFile(options.tsconfig, ts.sys.readFile);
      const workspaceRoot = path.dirname(options.tsconfig);
      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, workspaceRoot);
      logger.debug(`tsconfig 파싱 완료: ${parsed.fileNames.length}개 파일`);

      // AngularSourceFileCache 생성 (또는 재사용)
      sourceFileCache ??= new AngularSourceFileCache();

      // SCSS errors 수집용
      const scssErrors: string[] = [];

      // transformStylesheet 콜백 생성
      const cwd = process.cwd();
      const transformStylesheet = createClientTransformStylesheet({
        loadPaths: [
          path.join(workspaceRoot, "scss"),
          path.join(cwd, "node_modules"),
        ],
        postCssPlugins: options.postCssPlugins,
        scssErrors,
        scssDependencies,
        cacheDir: path.join(workspaceRoot, ".cache", "scss"),
      });

      // externalStylesheets (client mode에서 stylesheet SHA256 ID 매핑)
      const externalStylesheets = new Map<string, string>();

      // AngularCompiler 생성
      compiler = new AngularCompiler({
        rootNames: getPackageSourceFiles(workspaceRoot, parsed),
        compilerOptions: parsed.options,
        angularCompilerOptions: parsed.raw?.angularCompilerOptions,
        sourceFileCache,
        transformStylesheet,
        externalStylesheets,
        enableHmr: options.dev && !options.legacyModule,
        compilerOptionsTransformer: (opts) => ({
          ...opts,
          noEmit: false,
          declaration: false,
          declarationMap: false,
        }),
      });

      // JavaScriptTransformer 생성
      jsTransformer ??= createJsTransformer();

      // initialize
      logger.debug("AngularCompiler 초기화 중...");
      const initResult = await compiler.initialize();
      logger.debug(`AngularCompiler 초기화 완료 (affected: ${initResult.affectedFiles.size}개)`);

      // 초기 templateUpdates 수집
      templateUpdates.clear();
      if (initResult.templateUpdates != null) {
        for (const [key, value] of initResult.templateUpdates) {
          templateUpdates.set(key, value);
        }
      }

      // 영향받은 파일 emit + 캐시 (소스 파일 경로를 key로 사용)
      emittedFiles.clear();
      for (const result of compiler.emitAffectedFiles()) {
        emittedFiles.set(pathx.posix(result.sourceFileName), result.contents);
      }
      logger.debug(`emit 완료: ${emittedFiles.size}개 파일`);

      // 진단 수집 및 보고
      const diagnosticResult = collectAndFormatDiagnostics(compiler, process.cwd());
      reportDiagnostics(diagnosticResult);

      // SCSS 에러 보고
      for (const err of scssErrors) {
        logger.error(err);
      }

      // lint 실행 (활성화된 경우)
      let initialLintResult: LintWithProgramResult | undefined;
      if (options.enableLint === true) {
        initialLintResult = await getOrCreateLintRunner().lint({
          program: compiler.getTsProgram(),
        });
      }

      // 초기 빌드 결과 보고 (dev, prod 공통)
      options.onBuild?.({
        success: diagnosticResult.errors.length === 0,
        errors: diagnosticResult.errors.map((e) => e.message),
        warnings: diagnosticResult.warnings.map((w) => w.message),
        lint: initialLintResult,
      });
    },

    async handleHotUpdate({
      file,
      modules,
      server,
    }: {
      file: string;
      modules: ModuleNode[];
      server: ViteDevServer;
      timestamp: number;
      read: () => string | Promise<string>;
    }): Promise<ModuleNode[] | void> {
      if (compiler == null || !options.dev) return;
      if (
        !file.endsWith(".ts") &&
        !file.endsWith(".html") &&
        !file.endsWith(".scss")
      ) {
        return;
      }

      const normalizedFile = pathx.posix(file);
      let filesToUpdate: string[];

      if (file.endsWith(".scss")) {
        // SCSS @use 의존성 역방향 탐색: 변경된 SCSS를 @use하는 파일을 찾아 재컴파일
        const affectedOwnerFiles = findAffectedByScss(normalizedFile, scssDependencies);
        if (affectedOwnerFiles.length === 0) return;
        filesToUpdate = affectedOwnerFiles;
      } else {
        // 의존성 필터: TypeScript program에 포함되지 않은 파일은 건너뜀
        const programFiles = compiler.getTsProgram().getSourceFiles();
        const isInProgram = programFiles.some(
          (sf) => pathx.posix(sf.fileName) === normalizedFile,
        );
        if (!isInProgram) {
          logger.debug(`변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀: ${normalizedFile}`);
          return;
        }
        filesToUpdate = [file];
      }

      // 경쟁 조건 방지: 이전 HMR 처리 완료 대기
      const prevLock = hmrLock;
      let releaseLock!: () => void;
      hmrLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      await prevLock;

      options.onBuildStart?.();

      try {
        // rebuild 시작 시 이전 templateUpdates 정리
        templateUpdates.clear();

        const updateResult = await compiler.update(filesToUpdate);

        // templateUpdates 수집
        if (updateResult.templateUpdates != null) {
          for (const [key, value] of updateResult.templateUpdates) {
            templateUpdates.set(key, value);
          }
        }

        const affectedPaths: string[] = [];
        for (const result of compiler.emitAffectedFiles()) {
          const normalizedPath = pathx.posix(result.sourceFileName);
          emittedFiles.set(normalizedPath, result.contents);
          affectedPaths.push(normalizedPath);
        }

        const diagnosticResult = collectAndFormatDiagnostics(compiler, process.cwd());
        reportDiagnostics(diagnosticResult);

        // 영향받은 ts.SourceFile 집합을 파일명 문자열로 변환 (incremental lint용)
        const affectedFileNames = new Set<string>();
        for (const sf of updateResult.affectedFiles) {
          affectedFileNames.add(pathx.posix(sf.fileName));
        }

        // lint 실행 (활성화된 경우)
        let lintResult: LintWithProgramResult | undefined;
        if (options.enableLint === true) {
          lintResult = await getOrCreateLintRunner().lint({
            program: compiler.getTsProgram(),
            affectedFiles: affectedFileNames,
          });
        }

        options.onBuild?.({
          success: diagnosticResult.errors.length === 0,
          errors: diagnosticResult.errors.map((e) => e.message),
          warnings: diagnosticResult.warnings.map((w) => w.message),
          lint: lintResult,
        });

        if (file.endsWith(".scss")) {
          // SCSS: moduleGraph에서 영향받은 TS 모듈 조회
          const result: ModuleNode[] = [];
          for (const p of affectedPaths) {
            const mods = server.moduleGraph.getModulesByFile(p);
            if (mods) result.push(...mods);
          }
          return result;
        } else {
          // TS/HTML: 전달받은 modules에서 영향받은 모듈 필터
          const affectedSet = new Set(affectedPaths);
          return modules.filter(
            (m) => m.file != null && affectedSet.has(pathx.posix(m.file)),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`HMR recompile failed: ${message}`);
        options.onBuild?.({ success: false, errors: [message] });
        return;
      } finally {
        releaseLock();
      }
    },

    async transform(_code, id) {
      if (jsTransformer == null) return;

      let code = _code;

      // Phase 1: TS 컴파일 — .ts 파일은 AngularCompiler가 emit한 JS로 교체
      if (id.endsWith(".ts")) {
        const normalizedId = pathx.posix(id);
        const emittedContent = emittedFiles.get(normalizedId);
        if (emittedContent == null) return;
        code = emittedContent;
      } else if (!id.endsWith(".mjs") && !id.endsWith(".js")) {
        return;
      }

      // Phase 2: JS 변환 — Angular Linker로 partial → full AOT 링킹 + 최적화
      const transformed = await jsTransformer.transformData(pathx.posix(id), code, false);
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
      // dev 모드에서는 compiler/jsTransformer를 유지 (HMR용 incremental compilation)
      if (!options.dev) {
        if (jsTransformer != null) {
          await jsTransformer.close();
          jsTransformer = undefined;
        }
        await prebundleTransformer.close();
        compiler = undefined;
        emittedFiles.clear();
      }
    },

    configureServer(server: ViteDevServer) {
      // component-middleware 등록 (HMR template updates 서빙)
      server.middlewares.use(angularComponentMiddleware(templateUpdates, server.config.base));

      // dev server 종료 시 리소스 정리
      server.httpServer?.on("close", () => {
        void Promise.all([
          jsTransformer?.close(),
          prebundleTransformer.close(),
        ])
          .catch((err: unknown) => {
            logger.error(
              `Resource dispose failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          })
          .finally(() => {
            jsTransformer = undefined;
            compiler = undefined;
            emittedFiles.clear();
          });
      });
    },
  };
}

interface DiagnosticMessage {
  file?: string;
  line?: number;
  message: string;
}

interface DiagnosticResult {
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
}

function collectAndFormatDiagnostics(compiler: AngularCompiler, cwd: string): DiagnosticResult {
  const errors: DiagnosticMessage[] = [];
  const warnings: DiagnosticMessage[] = [];

  for (const diagnostic of compiler.collectDiagnostics()) {
    if (!isWorkspaceDiagnostic(diagnostic, cwd)) continue;

    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    const formatted: DiagnosticMessage = { message };

    if (diagnostic.file != null) {
      formatted.file = diagnostic.file.fileName;
      if (diagnostic.start != null) {
        const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        formatted.line = pos.line + 1;
      }
    }

    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(formatted);
    } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
      warnings.push(formatted);
    }
  }

  return { errors, warnings };
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

function reportDiagnostics(diagnostics: DiagnosticResult): void {
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
