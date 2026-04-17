import path from "path";
import fs from "fs";
import type esbuild from "esbuild";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

//#region AST 기반 Worker 패턴 탐지

/**
 * AST에서 탐지된 Worker 패턴 하나를 나타낸다.
 */
export interface WorkerMatch {
  type: "browser" | "node";
  /** 전체 표현식의 start/end (치환 범위) */
  start: number;
  end: number;
  /** Worker/SharedWorker 이름 (browser만) */
  workerType?: string;
  /** URL 경로 문자열 값 */
  urlPath: string;
  /** 옵션 객체의 원본 소스 텍스트 (browser만, 없으면 undefined) */
  existingOpts?: string;
}

/**
 * MemberExpression이 import.meta.url인지 확인한다.
 */
function isImportMetaUrl(node: any): boolean {
  return (
    node.type === "MemberExpression" &&
    node.object.type === "MetaProperty" &&
    node.object.meta.name === "import" &&
    node.object.property.name === "meta" &&
    node.property.type === "Identifier" &&
    node.property.name === "url"
  );
}

/**
 * acorn AST를 사용하여 소스 코드에서 Worker/SharedWorker 및 import.meta.resolve 패턴을 탐지한다.
 *
 * 정규식과 달리 주석, 문자열 리터럴 내부의 패턴을 오탐하지 않는다.
 * 파싱 실패 시 빈 배열을 반환한다.
 */
export function findWorkerPatterns(content: string): WorkerMatch[] {
  let ast: acorn.Node;
  try {
    ast = acorn.parse(content, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
  } catch {
    return [];
  }

  const matches: WorkerMatch[] = [];

  walk.simple(ast, {
    NewExpression(node: any) {
      // new Worker(new URL("path", import.meta.url), opts?)
      // new SharedWorker(new URL("path", import.meta.url), opts?)
      if (
        node.callee.type !== "Identifier" ||
        (node.callee.name !== "Worker" && node.callee.name !== "SharedWorker")
      ) {
        return;
      }

      const args = node.arguments;
      if (args.length < 1) return;

      const urlArg = args[0];
      if (
        urlArg.type !== "NewExpression" ||
        urlArg.callee.type !== "Identifier" ||
        urlArg.callee.name !== "URL"
      ) {
        return;
      }

      const urlArgs = urlArg.arguments;
      if (urlArgs.length < 2) return;

      // 첫 번째 인자: 문자열 리터럴 (경로)
      if (urlArgs[0].type !== "Literal" || typeof urlArgs[0].value !== "string") return;

      // 두 번째 인자: import.meta.url
      if (!isImportMetaUrl(urlArgs[1])) return;

      const match: WorkerMatch = {
        type: "browser",
        start: node.start,
        end: node.end,
        workerType: node.callee.name,
        urlPath: urlArgs[0].value,
      };

      // 옵션 객체 (두 번째 인자)
      if (args.length >= 2) {
        match.existingOpts = content.slice(args[1].start, args[1].end);
      }

      matches.push(match);
    },

    CallExpression(node: any) {
      // import.meta.resolve("./relative-path")
      const callee = node.callee;
      if (
        callee.type !== "MemberExpression" ||
        callee.object.type !== "MetaProperty" ||
        callee.object.meta.name !== "import" ||
        callee.object.property.name !== "meta" ||
        callee.property.type !== "Identifier" ||
        callee.property.name !== "resolve"
      ) {
        return;
      }

      const args = node.arguments;
      if (args.length < 1) return;

      if (args[0].type !== "Literal" || typeof args[0].value !== "string") return;

      const urlPath = args[0].value as string;
      // 상대 경로만 처리
      if (!urlPath.startsWith("./") && !urlPath.startsWith("../")) return;

      matches.push({
        type: "node",
        start: node.start,
        end: node.end,
        urlPath,
      });
    },
  });

  return matches.sort((a, b) => a.start - b.start);
}

//#endregion

/**
 * Worker 번들 빌드 결과를 포함하는 transform 결과.
 */
export interface TransformWorkerResult {
  contents: string;
  errors: esbuild.PartialMessage[];
  warnings: esbuild.PartialMessage[];
  /** write: false일 때 Worker 번들의 outputFiles (onEnd에서 병합용) */
  workerOutputFiles?: esbuild.OutputFile[];
  /** Worker 번들의 metafile (onEnd에서 병합용) */
  workerMetafile?: esbuild.Metafile;
}

/**
 * Worker 파일을 esbuild.buildSync()로 별도 ESM 번들로 빌드한다.
 * esbuild-angular-compiler-plugin.ts의 bundleWebWorker를 기반으로 작성.
 */
function bundleWorker(
  build: esbuild.PluginBuild,
  workerFile: string,
  platform: esbuild.Platform,
): esbuild.BuildResult {
  const sourcemap =
    build.initialOptions.sourcemap != null &&
    build.initialOptions.sourcemap !== false;
  const write = build.initialOptions.write !== false;

  try {
    return build.esbuild.buildSync({
      ...build.initialOptions,
      platform,
      write,
      bundle: true,
      metafile: true,
      format: "esm",
      entryNames: "worker-[hash]",
      entryPoints: [workerFile],
      sourcemap,
      // 메인 빌드에서 상속하지 않는 옵션
      external: undefined,
      supported: undefined,
      plugins: undefined,
      outbase: undefined,
      inject: undefined,
    });
  } catch (error) {
    if (
      error != null &&
      typeof error === "object" &&
      "errors" in error &&
      "warnings" in error
    ) {
      return error as esbuild.BuildResult;
    }
    throw error;
  }
}

/**
 * 파일 내용에서 Worker/SharedWorker 패턴을 감지하여 Worker 파일을 번들링하고
 * URL 경로를 번들된 파일 경로로 치환한다.
 *
 * Angular 플러그인 등 외부에서 직접 호출할 수 있도록 export한다 (D2).
 *
 * @returns 변환 결과. 패턴이 없으면 undefined.
 */
export function transformWorkerPatterns(
  content: string,
  filePath: string,
  build: esbuild.PluginBuild,
): TransformWorkerResult | undefined {
  // 빠른 사전 필터 — AST 파싱 전에 키워드 존재 여부로 걸러냄 (원본 TS content 기준)
  if (!content.includes("Worker") && !content.includes("import.meta.resolve")) {
    return undefined;
  }

  const errors: esbuild.PartialMessage[] = [];
  const warnings: esbuild.PartialMessage[] = [];

  // TS(.ts/.cts/.mts)는 JS로 변환한 후 AST 파싱. acorn은 TS 구문을 처리하지 못하므로
  // import type, 타입 어노테이션 등이 있으면 파싱 실패로 Worker 패턴이 조용히 누락된다.
  let effectiveContent = content;
  if (/\.[cm]?ts$/.test(filePath)) {
    try {
      const transformed = build.esbuild.transformSync(content, {
        loader: "ts",
        sourcemap: false,
      });
      effectiveContent = transformed.code;
      warnings.push(...transformed.warnings);
    } catch (e) {
      const failure = e as {
        errors?: esbuild.PartialMessage[];
        warnings?: esbuild.PartialMessage[];
      };
      return {
        contents: content,
        errors: failure.errors ?? [
          { text: `TS transform failed: ${String(e)}`, location: null },
        ],
        warnings: failure.warnings ?? [],
      };
    }
  }

  // AST 기반 패턴 탐지 (변환된 JS 기준)
  const matches = findWorkerPatterns(effectiveContent);
  if (matches.length === 0) {
    return undefined;
  }

  const allOutputFiles: esbuild.OutputFile[] = [];
  let mergedMetafile: esbuild.Metafile | undefined;

  const write = build.initialOptions.write !== false;
  const outdir = build.initialOptions.outdir ?? "";
  const containingDir = path.dirname(filePath);

  /**
   * Worker 번들을 빌드하고, 결과에서 출력 파일 경로를 찾아 반환한다.
   * 에러/경고/outputFiles/metafile을 외부 변수에 수집한다.
   */
  function processWorkerBundle(
    fullWorkerPath: string,
    platform: esbuild.Platform,
  ): string | undefined {
    const workerResult = bundleWorker(build, fullWorkerPath, platform);

    warnings.push(...workerResult.warnings);

    if (workerResult.errors.length > 0) {
      errors.push(...workerResult.errors);
      return undefined;
    }

    if (!write && workerResult.outputFiles != null) {
      allOutputFiles.push(...workerResult.outputFiles);
    }

    if (workerResult.metafile != null) {
      if (mergedMetafile == null) {
        mergedMetafile = { inputs: {}, outputs: {} };
      }
      Object.assign(mergedMetafile.inputs, workerResult.metafile.inputs);
      Object.assign(mergedMetafile.outputs, workerResult.metafile.outputs);
    }

    const workerCodeFile =
      workerResult.outputFiles?.find((file) =>
        /^worker-[a-z0-9]+\.[cm]?js$/i.test(path.basename(file.path)),
      ) ??
      (workerResult.metafile != null
        ? (() => {
            const outputKey = Object.keys(workerResult.metafile.outputs).find(
              (key) => /worker-[a-z0-9]+\.[cm]?js$/i.test(path.basename(key)),
            );
            return outputKey != null ? { path: path.resolve(outputKey) } : undefined;
          })()
        : undefined);

    if (workerCodeFile == null) {
      errors.push({
        text: `Worker 번들 출력 파일을 찾을 수 없습니다: ${fullWorkerPath}`,
        location: null,
      });
      return undefined;
    }

    // outdir 루트 기준 상대 경로. bundleWorker에서 outbase: undefined를 설정하여
    // Worker 파일이 항상 outdir 루트에 출력됨을 보장한다.
    return path.relative(outdir, workerCodeFile.path).replaceAll("\\", "/");
  }

  // 정방향 chunks 패턴으로 치환 (esbuild-postcss-plugin.ts 동일 패턴)
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const match of matches) {
    if (match.type === "browser") {
      const fullWorkerPath = path.resolve(containingDir, match.urlPath);
      const workerCodePath = processWorkerBundle(fullWorkerPath, "browser");
      if (workerCodePath == null) continue;

      const optsStr = match.existingOpts ?? '{ type: "module" }';
      replacements.push({
        start: match.start,
        end: match.end,
        text: `new ${match.workerType}(new URL("${workerCodePath}", import.meta.url), ${optsStr})`,
      });
    } else {
      const fullWorkerPath = path.resolve(containingDir, match.urlPath);
      const workerCodePath = processWorkerBundle(
        fullWorkerPath,
        build.initialOptions.platform ?? "browser",
      );
      if (workerCodePath == null) continue;

      replacements.push({
        start: match.start,
        end: match.end,
        text: `new URL("${workerCodePath}", import.meta.url).href`,
      });
    }
  }

  // chunks 조립 (변환된 JS 기준 — 매치의 start/end는 effectiveContent 오프셋)
  const chunks: string[] = [];
  let cursor = 0;
  for (const rep of replacements) {
    chunks.push(effectiveContent.slice(cursor, rep.start));
    chunks.push(rep.text);
    cursor = rep.end;
  }
  chunks.push(effectiveContent.slice(cursor));

  return {
    contents: chunks.join(""),
    errors,
    warnings,
    workerOutputFiles: allOutputFiles.length > 0 ? allOutputFiles : undefined,
    workerMetafile: mergedMetafile,
  };
}

/**
 * esbuild Worker 번들링 플러그인을 생성한다.
 *
 * onLoad에서 .js/.ts 파일의 Worker/SharedWorker 패턴을 감지하여
 * Worker 파일을 별도 ESM 번들로 빌드하고, URL 경로를 번들된 파일로 치환한다.
 */
export function createWorkerBundlePlugin(): esbuild.Plugin {
  return {
    name: "sd-worker-bundle",
    setup(build) {
      const pendingWorkerResults: Array<{
        outputFiles?: esbuild.OutputFile[];
        metafile?: esbuild.Metafile;
      }> = [];

      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) => {
        const content = fs.readFileSync(args.path, "utf-8");
        const result = transformWorkerPatterns(content, args.path, build);
        if (result == null) return undefined;

        // write: false일 때 Worker outputFiles를 모아뒀다가 onEnd에서 병합
        if (result.workerOutputFiles != null || result.workerMetafile != null) {
          pendingWorkerResults.push({
            outputFiles: result.workerOutputFiles,
            metafile: result.workerMetafile,
          });
        }

        // TS(.ts/.cts/.mts)는 transformWorkerPatterns 내부에서 JS로 변환되어 반환되므로
        // loader는 "js". .tsx/.jsx는 변환하지 않으므로 esbuild가 JSX를 처리하도록 "tsx".
        const isJsx = /\.[cm]?tsx$/.test(args.path) || args.path.endsWith(".jsx");
        return {
          contents: result.contents,
          loader: isJsx ? ("tsx" as const) : ("js" as const),
          errors: result.errors.length > 0 ? result.errors : undefined,
          warnings: result.warnings.length > 0 ? result.warnings : undefined,
        };
      });

      build.onEnd((result) => {
        for (const wr of pendingWorkerResults) {
          if (wr.outputFiles != null && wr.outputFiles.length > 0) {
            result.outputFiles?.push(...wr.outputFiles);
          }
          if (result.metafile != null && wr.metafile != null) {
            Object.assign(result.metafile.inputs, wr.metafile.inputs);
            Object.assign(result.metafile.outputs, wr.metafile.outputs);
          }
        }
        pendingWorkerResults.length = 0;
      });
    },
  };
}
