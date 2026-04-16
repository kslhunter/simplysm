import path from "path";
import fs from "fs";
import type esbuild from "esbuild";

/**
 * Worker/SharedWorker + new URL + import.meta.url 패턴을 감지하는 정규식.
 *
 * 캡처 그룹:
 * - Group 1: `Worker` 또는 `SharedWorker`
 * - Group 2: URL 경로 (예: `"./worker.ts"`)
 * - Group 3: 옵션 객체 (예: `{ type: "module" }`) — 없으면 undefined
 */
const WORKER_PATTERN =
  /\bnew\s+(Worker|SharedWorker)\s*\(\s*new\s+URL\s*\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)\s*(?:,\s*(\{[^}]*\}))?\s*\)/g;

/**
 * Node.js import.meta.resolve 패턴을 감지하는 정규식.
 * 상대 경로(./ 또는 ../)만 감지 — 절대 모듈 경로("some-package")는 무시.
 *
 * 캡처 그룹:
 * - Group 1: 상대 경로 (예: `"../workers/service-protocol.worker"`)
 */
const NODE_WORKER_PATTERN =
  /\bimport\.meta\.resolve\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g;

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
  // 빠른 사전 필터
  const hasBrowserWorker = content.includes("Worker") && WORKER_PATTERN.test(content);
  if (hasBrowserWorker) WORKER_PATTERN.lastIndex = 0;

  const hasNodeWorker =
    content.includes("import.meta.resolve") && NODE_WORKER_PATTERN.test(content);
  if (hasNodeWorker) NODE_WORKER_PATTERN.lastIndex = 0;

  if (!hasBrowserWorker && !hasNodeWorker) {
    return undefined;
  }

  const errors: esbuild.PartialMessage[] = [];
  const warnings: esbuild.PartialMessage[] = [];
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

  let transformed = content;

  // 1. 브라우저 Worker 패턴 처리 (new Worker(new URL("path", import.meta.url)))
  if (hasBrowserWorker) {
    transformed = transformed.replace(
      WORKER_PATTERN,
      (match, workerType: string, urlPath: string, existingOpts?: string) => {
        const fullWorkerPath = path.resolve(containingDir, urlPath);
        const workerCodePath = processWorkerBundle(fullWorkerPath, "browser");
        if (workerCodePath == null) return match;

        const optsStr = existingOpts != null ? existingOpts : '{ type: "module" }';
        return `new ${workerType}(new URL("${workerCodePath}", import.meta.url), ${optsStr})`;
      },
    );
  }

  // 2. Node.js import.meta.resolve 패턴 처리
  if (hasNodeWorker) {
    transformed = transformed.replace(
      NODE_WORKER_PATTERN,
      (match, resolvePath: string) => {
        const fullWorkerPath = path.resolve(containingDir, resolvePath);
        const workerCodePath = processWorkerBundle(
          fullWorkerPath,
          build.initialOptions.platform ?? "browser",
        );
        if (workerCodePath == null) return match;

        return `new URL("${workerCodePath}", import.meta.url).href`;
      },
    );
  }

  return {
    contents: transformed,
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

        return {
          contents: result.contents,
          loader: /\.[cm]?tsx?$/.test(args.path) ? ("ts" as const) : ("js" as const),
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
