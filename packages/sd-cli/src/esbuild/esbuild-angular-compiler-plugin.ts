import path from "path";
import fs from "fs";
import os from "os";
import ts from "typescript";
import type esbuild from "esbuild";
import { consola } from "consola";
import { JavaScriptTransformer, Cache as AngularCache } from "@angular/build/private";
import type { AngularSourceFileCache } from "../angular/angular-compiler";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import { SdTsCompiler } from "../ts-compiler/SdTsCompiler";
import type { ISdTsCompilerResult } from "../ts-compiler/sd-ts-compiler-result";
import { FileReferenceTracker } from "./file-reference-tracker";
import { LmdbCacheStore } from "./lmdb-cache-store";
import { createCachedLoad, type LoadResultCache } from "./load-result-cache";
import { collectHmrCandidates, HMR_MODIFIED_FILE_LIMIT } from "../angular/hmr-candidates";
import { transformWorkerPatterns } from "./esbuild-worker-plugin";

const logger = consola.withTag("sd:cli:angular-plugin");

//#region Types

export interface AngularCompilerPluginOptions {
  tsconfig: string;
  sourcemap: boolean;
  advancedOptimizations: boolean;
  thirdPartySourcemaps: boolean;
  incremental: boolean;
  includeTestMetadata?: boolean;
  templateUpdates?: Map<string, string>;

  sourceFileCache?: AngularSourceFileCache;
  typeScriptFileCache?: Map<string, string | Uint8Array>;
  loadResultCache?: LoadResultCache;

  persistentCachePath?: string;

  transformStylesheet?: (
    data: string,
    containingFile: string,
    stylesheetFile?: string,
  ) => Promise<string | null>;

  externalStylesheets?: Map<string, string>;

  /** SCSS 의존성 Map (transformStylesheet가 기록, Plugin이 FileReferenceTracker에 등록) */
  stylesheetDependencies?: Map<string, Set<string>>;
  /** SCSS 에러 배열 (transformStylesheet가 기록, Plugin이 esbuild errors로 변환) */
  stylesheetErrors?: string[];
}

//#endregion

//#region compilerOptions 변환

export function createCompilerOptionsTransformer(
  options: AngularCompilerPluginOptions,
  preserveSymlinks: boolean | undefined,
): (compilerOptions: ts.CompilerOptions) => ts.CompilerOptions {
  return (compilerOptions: ts.CompilerOptions) => {
    // target < ES2022이면 강제 ES2022
    if (compilerOptions.target == null || compilerOptions.target < ts.ScriptTarget.ES2022) {
      compilerOptions.target = ts.ScriptTarget.ES2022;
      compilerOptions.useDefineForClassFields ??= false;
    }

    // module < ES2015이면 강제 ES2022
    if (compilerOptions.module == null || compilerOptions.module < ts.ModuleKind.ES2015) {
      compilerOptions.module = ts.ModuleKind.ES2022;
    }

    // compilationMode: partial → full
    if ((compilerOptions as Record<string, unknown>)["compilationMode"] === "partial") {
      (compilerOptions as Record<string, unknown>)["compilationMode"] = "full";
    }

    return {
      ...compilerOptions,
      noEmitOnError: false,
      composite: false,
      declaration: false,
      declarationMap: false,
      inlineSources: !!options.sourcemap,
      inlineSourceMap: !!options.sourcemap,
      sourceMap: undefined,
      mapRoot: undefined,
      sourceRoot: undefined,
      preserveSymlinks,
      incremental: options.persistentCachePath != null,
      tsBuildInfoFile:
        options.persistentCachePath != null
          ? path.join(options.persistentCachePath, ".tsbuildinfo")
          : undefined,
      _enableHmr: !!options.templateUpdates,
      supportTestBed: !!options.includeTestMetadata,
      supportJitMode: !!options.includeTestMetadata,
    } as ts.CompilerOptions;
  };
}

//#endregion

//#region diagnostics 변환

export function convertDiagnostic(
  diagnostic: ts.Diagnostic,
  cwd: string,
): esbuild.PartialMessage {
  const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  let location: esbuild.PartialMessage["location"] = null;

  if (diagnostic.file != null && diagnostic.start != null) {
    const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const lineStart = diagnostic.file.getLineStarts()[pos.line];
    const lineEnd = diagnostic.file.getLineStarts()[pos.line + 1] ?? diagnostic.file.text.length;
    const lineText = diagnostic.file.text.slice(lineStart, lineEnd).replace(/\r?\n$/, "");
    location = {
      file: path.relative(cwd, diagnostic.file.fileName),
      line: pos.line + 1,
      column: pos.character,
      lineText,
      length: diagnostic.length ?? 0,
    };
  }

  return { text, location };
}

export function convertSerializedDiagnosticToEsbuild(
  d: SerializedDiagnostic,
  program: ts.Program,
  cwd: string,
): esbuild.PartialMessage {
  let location: esbuild.PartialMessage["location"] = null;
  if (d.file != null && d.start != null) {
    const sf = program.getSourceFile(d.file.fileName);
    if (sf != null) {
      const pos = sf.getLineAndCharacterOfPosition(d.start);
      const lineStart = sf.getLineStarts()[pos.line];
      const lineEnd = sf.getLineStarts()[pos.line + 1] ?? sf.text.length;
      const lineText = sf.text.slice(lineStart, lineEnd).replace(/\r?\n$/, "");
      location = {
        file: path.relative(cwd, d.file.fileName),
        line: pos.line + 1,
        column: pos.character,
        lineText,
        length: d.length ?? 0,
      };
    }
  }
  return { text: d.messageText, location };
}

//#endregion

//#region onLoad 헬퍼

const POTENTIAL_METADATA_REGEX =
  /@angular\/core|@Component|@Directive|@Injectable|@Pipe|@NgModule/;

export function requiresAngularCompiler(contents: string): boolean {
  return POTENTIAL_METADATA_REGEX.test(contents);
}

export function createMissingFileDiagnostic(
  request: string,
  original: string,
  root: string,
  angular: boolean,
): esbuild.PartialMessage {
  const relativeRequest = path.relative(root, request);
  const notes: esbuild.PartialNote[] = [];

  if (angular) {
    notes.push({
      text:
        "Files containing Angular metadata ('@Component'/'@Directive'/etc.) must be part of the TypeScript compilation." +
        " You can ensure the file is part of the TypeScript program via the 'files' or 'include' property.",
    });
  } else {
    notes.push({
      text:
        "The file will be bundled and included in the output but will not be type-checked at build time." +
        " To remove this message you can add the file to the TypeScript program via the 'files' or 'include' property.",
    });
  }

  const relativeOriginal = path.relative(root, original);
  if (relativeRequest !== relativeOriginal) {
    notes.push({
      text: `File is requested from a file replacement of '${relativeOriginal}'.`,
    });
  }

  return {
    text: `File '${relativeRequest}' not found in TypeScript compilation.`,
    notes,
  };
}

//#endregion

//#region Plugin 팩토리

export function createAngularCompilerPlugin(
  pluginOptions: AngularCompilerPluginOptions,
): esbuild.Plugin {
  return {
    name: "sd-angular-compiler",
    setup(build: esbuild.PluginBuild) {
      const preserveSymlinks = build.initialOptions.preserveSymlinks;
      const cwd = build.initialOptions.absWorkingDir ?? process.cwd();

      // ── define 주입 ──
      build.initialOptions.define ??= {};
      build.initialOptions.define["ngI18nClosureMode"] ??= "false";

      // ── LMDB 캐시 초기화 ──
      let cacheStore: LmdbCacheStore<Uint8Array> | undefined;
      if (pluginOptions.persistentCachePath != null) {
        try {
          cacheStore = new LmdbCacheStore(
            path.join(pluginOptions.persistentCachePath, "angular-compiler.db"),
          );
        } catch (e) {
          logger.warn("LMDB 캐시 초기화 실패:", e instanceof Error ? e.message : String(e));
        }
      }

      // ── JavaScriptTransformer 초기화 ──
      const maxWorkers = Math.max(Math.floor((os.cpus().length * 7) / 8), 1);
      const javascriptTransformer = new JavaScriptTransformer(
        {
          sourcemap: !!pluginOptions.sourcemap,
          thirdPartySourcemaps: pluginOptions.thirdPartySourcemaps,
          advancedOptimizations: pluginOptions.advancedOptimizations,
          jit: pluginOptions.includeTestMetadata === true,
        },
        maxWorkers,
        cacheStore != null ? new AngularCache(cacheStore, "jstransformer") : undefined,
      );

      // ── 내부 상태 ──
      const typeScriptFileCache: Map<string, string | Uint8Array> =
        pluginOptions.typeScriptFileCache ?? new Map();
      // containingFile별 Worker 번들 결과. 증분 빌드에서 변경된 파일만 선택적으로
      // 제거하여, 변경되지 않은 Worker metafile/outputFiles가 유지되도록 함.
      const workerResultsByContainingFile = new Map<
        string,
        { outputFiles?: esbuild.OutputFile[]; metafile?: esbuild.Metafile }
      >();
      const referencedFileTracker = new FileReferenceTracker();
      let sdTsCompiler: SdTsCompiler | undefined;
      let lastResult: ISdTsCompilerResult | undefined;
      let hasCompilationErrors = true;
      // TS/JS onLoad에서 참조할 플래그 (onStart에서 compilerOptions 기반으로 결정)
      let shouldTsIgnoreJs = true;
      let useTypeScriptTranspilation = true;

      async function hasSideEffects(filePath: string): Promise<boolean | undefined> {
        if (!pluginOptions.advancedOptimizations) {
          return undefined;
        }
        const { sideEffects } = await build.resolve(filePath, {
          kind: "import-statement",
          resolveDir: cwd,
        });
        return sideEffects;
      }

      // ── onStart ──
      build.onStart(async () => {
        const result: esbuild.OnStartResult = {};
        const errors: esbuild.PartialMessage[] = [];
        const warnings: esbuild.PartialMessage[] = [];

        // ── stylesheetErrors 리셋 (stale 에러 방지) ──
        if (pluginOptions.stylesheetErrors != null) {
          pluginOptions.stylesheetErrors.length = 0;
        }

        try {
          const sourceFileCache = pluginOptions.sourceFileCache;
          const isIncremental =
            sdTsCompiler != null &&
            sourceFileCache != null &&
            sourceFileCache.modifiedFiles.size > 0;

          // ── HMR: staleSourceFiles 캡처 (compileAsync 전에 수행) ──
          let staleSourceFiles: Map<string, ts.SourceFile> | undefined;
          let expandedModifiedFiles: Set<string> | undefined;

          if (isIncremental) {
            const useHmr =
              pluginOptions.templateUpdates != null &&
              sourceFileCache.modifiedFiles.size <= HMR_MODIFIED_FILE_LIMIT;

            if (useHmr && lastResult != null) {
              for (const modifiedFile of sourceFileCache.modifiedFiles) {
                const sf = lastResult.program.getSourceFile(modifiedFile);
                if (sf != null) {
                  staleSourceFiles ??= new Map();
                  staleSourceFiles.set(modifiedFile, sf);
                }
              }
            }

            // referencedFileTracker 확장
            expandedModifiedFiles = referencedFileTracker.update(
              sourceFileCache.modifiedFiles,
            );

            // 변경된 파일의 Worker 결과만 선택적 제거 (변경되지 않은 파일의
            // Worker metafile은 유지되어 onEnd에서 재병합됨)
            for (const file of expandedModifiedFiles) {
              workerResultsByContainingFile.delete(file);
            }
          }

          // ── SdTsCompiler 인스턴스 생성 (첫 빌드 시) ──
          if (sdTsCompiler == null) {
            sdTsCompiler = new SdTsCompiler({
              pkgDir: path.dirname(pluginOptions.tsconfig),
              cwd,
              output: { js: true, dts: false },
              sourceFileCache: pluginOptions.sourceFileCache,
              transformStylesheet: pluginOptions.transformStylesheet,
              externalStylesheets: pluginOptions.externalStylesheets,
              compilerOptionsTransformer: createCompilerOptionsTransformer(
                pluginOptions,
                preserveSymlinks,
              ),
            });
          }

          // ── compileAsync ──
          const compileResult = await sdTsCompiler.compileAsync(
            isIncremental ? expandedModifiedFiles : undefined,
          );

          // ── emitResults → typeScriptFileCache (Worker 패턴 처리 포함) ──
          for (const { contents, sourceFileName } of compileResult.emitResults ?? []) {
            const normalized = path.normalize(sourceFileName);
            const workerResult = transformWorkerPatterns(contents, normalized, build);
            if (workerResult != null) {
              typeScriptFileCache.set(normalized, workerResult.contents);
              errors.push(...workerResult.errors);
              warnings.push(...workerResult.warnings);
              if (workerResult.workerMetafile != null) {
                referencedFileTracker.add(
                  normalized,
                  Object.keys(workerResult.workerMetafile.inputs).map((input) =>
                    path.join(cwd, input),
                  ),
                );
              }
              if (
                workerResult.workerMetafile != null ||
                workerResult.workerOutputFiles != null
              ) {
                workerResultsByContainingFile.set(normalized, {
                  outputFiles: workerResult.workerOutputFiles,
                  metafile: workerResult.workerMetafile,
                });
              }
            } else {
              typeScriptFileCache.set(normalized, contents);
            }
          }

          // ── onLoad 플래그 결정 (첫 빌드에서만) ──
          if (lastResult == null) {
            const co = compileResult.program.getCompilerOptions();
            shouldTsIgnoreJs = !co.allowJs;
            useTypeScriptTranspilation =
              !co.isolatedModules || !!co.sourceMap || !!co.inlineSourceMap;
          }

          // ── diagnostics → esbuild errors/warnings ──
          for (const d of compileResult.diagnostics) {
            const msg = convertSerializedDiagnosticToEsbuild(d, compileResult.program, cwd);
            if (d.category === ts.DiagnosticCategory.Error) {
              errors.push(msg);
            } else if (d.category === ts.DiagnosticCategory.Warning) {
              warnings.push(msg);
            }
          }

          // ── stylesheetDependencies → FileReferenceTracker 브릿징 ──
          if (pluginOptions.stylesheetDependencies != null) {
            for (const [containingFile, deps] of pluginOptions.stylesheetDependencies) {
              referencedFileTracker.add(containingFile, deps);
            }
          }

          // ── stylesheetErrors → esbuild errors 변환 ──
          if (pluginOptions.stylesheetErrors != null) {
            for (const errText of pluginOptions.stylesheetErrors) {
              errors.push({ text: errText, location: null });
            }
          }

          // ── HMR templateUpdates 수집 (증분 빌드 시) ──
          if (
            isIncremental &&
            staleSourceFiles != null &&
            compileResult.ngtscProgram != null &&
            pluginOptions.templateUpdates != null
          ) {
            const hmrCandidates = collectHmrCandidates(
              sourceFileCache.modifiedFiles,
              compileResult.ngtscProgram,
              staleSourceFiles,
            );

            if (hmrCandidates.size > 0) {
              const ngCompiler = compileResult.ngtscProgram.compiler;

              for (const node of hmrCandidates) {
                if (!ts.isClassDeclaration(node)) continue;

                const componentFilename = node.getSourceFile().fileName;
                let relativePath = path.relative(cwd, componentFilename);
                if (relativePath.startsWith("..")) {
                  relativePath = componentFilename;
                }
                relativePath = relativePath.replaceAll("\\", "/");

                const updateId = encodeURIComponent(
                  `${relativePath}@${node.name?.text}`,
                );
                const updateText = (ngCompiler as unknown as { emitHmrUpdateModule?: (node: ts.ClassDeclaration) => string | null })
                  .emitHmrUpdateModule?.(node);

                if (updateText == null) {
                  pluginOptions.templateUpdates.clear();
                  break;
                }

                pluginOptions.templateUpdates.set(updateId, updateText);
              }
            }
          }

          hasCompilationErrors = errors.length > 0;
          lastResult = compileResult;
        } catch (error) {
          hasCompilationErrors = true;
          errors.push({
            text: "Angular compilation failed.",
            location: null,
            notes: [
              {
                text: error instanceof Error ? (error.stack ?? error.message) : `${error}`,
                location: null,
              },
            ],
          });
        }

        if (errors.length > 0) result.errors = errors;
        if (warnings.length > 0) result.warnings = warnings;
        return result;
      });

      // ── TS onLoad ── (filter: .ts, .tsx, .mts, .cts, .js, .mjs, .cjs, .jsx)
      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
        const request = path.normalize(args.path);
        const isJS = /\.[cm]?js$/.test(request);

        // allowJs 미설정 시 JS 파일은 다음 핸들러에 위임
        if (shouldTsIgnoreJs && isJS) {
          return undefined;
        }

        let contents = typeScriptFileCache.get(request);

        if (contents == null) {
          // 컴파일 에러가 있으면 빈 contents 반환 (연쇄 에러 방지)
          if (hasCompilationErrors) {
            return { contents: "", loader: "js" as const };
          }

          // allowJs이고 JS 파일이면 다음 핸들러에 위임
          if (!shouldTsIgnoreJs && isJS) {
            return undefined;
          }

          // Angular 데코레이터 여부 검사
          const directContents = await fs.promises.readFile(request, "utf-8");
          if (!requiresAngularCompiler(directContents)) {
            return {
              warnings: [createMissingFileDiagnostic(request, args.path, cwd, false)],
              contents: undefined,
              loader: "ts" as const,
              resolveDir: path.dirname(request),
            };
          }

          return {
            errors: [createMissingFileDiagnostic(request, args.path, cwd, true)],
          };
        }

        // string 타입이면 JavaScriptTransformer로 추가 변환
        if (typeof contents === "string" && (useTypeScriptTranspilation || isJS)) {
          const sideEffects = await hasSideEffects(request);
          contents = await javascriptTransformer.transformData(
            request,
            contents,
            true, // skipLinker
            sideEffects,
          );
          // Uint8Array로 재캐싱
          typeScriptFileCache.set(request, contents);
        }

        // loader 결정
        const loader: "js" | "ts" | "tsx" =
          useTypeScriptTranspilation || isJS
            ? "js"
            : request.at(-1) === "x"
              ? "tsx"
              : "ts";

        return {
          contents,
          loader,
          resolveDir: path.dirname(request),
        };
      });

      // ── JS onLoad ── (filter: .js, .mjs, .cjs)
      build.onLoad(
        { filter: /\.[cm]?js$/ },
        createCachedLoad(pluginOptions.loadResultCache, async (args) => {
          const request = path.normalize(args.path);
          const sideEffects = await hasSideEffects(request);
          const contents = await javascriptTransformer.transformFile(
            request,
            false, // skipLinker
            sideEffects,
          );

          // Worker 패턴 처리 (D2)
          const textContents = new TextDecoder().decode(contents);
          const workerResult = transformWorkerPatterns(textContents, request, build);
          if (workerResult != null) {
            if (workerResult.workerMetafile != null) {
              referencedFileTracker.add(
                request,
                Object.keys(workerResult.workerMetafile.inputs).map((input) =>
                  path.join(cwd, input),
                ),
              );
            }
            if (
              workerResult.workerMetafile != null ||
              workerResult.workerOutputFiles != null
            ) {
              workerResultsByContainingFile.set(request, {
                outputFiles: workerResult.workerOutputFiles,
                metafile: workerResult.workerMetafile,
              });
            }
            return {
              contents: workerResult.contents,
              loader: "js" as const,
              resolveDir: path.dirname(request),
              errors: workerResult.errors.length > 0 ? workerResult.errors : undefined,
              warnings: workerResult.warnings.length > 0 ? workerResult.warnings : undefined,
            };
          }

          return {
            contents,
            loader: "js" as const,
            resolveDir: path.dirname(request),
          };
        }),
      );

      // ── onEnd ──
      build.onEnd((result: esbuild.BuildResult) => {
        for (const wr of workerResultsByContainingFile.values()) {
          if (wr.outputFiles != null && wr.outputFiles.length > 0) {
            result.outputFiles?.push(...wr.outputFiles);
          }
          if (result.metafile != null && wr.metafile != null) {
            Object.assign(result.metafile.inputs, wr.metafile.inputs);
            Object.assign(result.metafile.outputs, wr.metafile.outputs);
          }
        }
      });

      // ── onDispose ──
      build.onDispose(() => {
        sdTsCompiler = undefined;
        lastResult = undefined;
        void javascriptTransformer.close();
        void cacheStore?.close();
      });
    },
  };
}

//#endregion
