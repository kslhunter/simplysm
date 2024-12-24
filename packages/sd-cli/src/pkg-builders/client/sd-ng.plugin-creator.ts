import esbuild from "esbuild";
import path from "path";
import os from "os";
import { JavaScriptTransformer } from "@angular/build/src/tools/esbuild/javascript-transformer";
import { SdLogger, PathUtils, type TNormPath } from "@simplysm/sd-core-node";
import { SdCliPerformanceTimer } from "../../utils/sd-cli-performance-time";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { type ISdCliNgPluginResultCache } from "../../types/build-plugin.types";
import { type ISdTsCompilerResult } from "../../types/ts-compiler.types";
import { SdTsCompiler } from "../../ts-compiler/sd-ts-compiler";

export function createSdNgPlugin(conf: {
  pkgPath: TNormPath;
  dev: boolean;
  modifiedFileSet: Set<TNormPath>;
  result: ISdCliNgPluginResultCache;
  watchScopePaths: TNormPath[];
}): esbuild.Plugin {
  let webWorkerResultMap = new Map<
    TNormPath,
    {
      outputFiles: esbuild.OutputFile[];
      metafile?: esbuild.Metafile;
      errors?: esbuild.Message[];
      warnings?: esbuild.Message[];
    }
  >();

  // let workerRevDepMap = new Map<TNormPath, Set<TNormPath>>();

  let perf: SdCliPerformanceTimer;
  const logger = SdLogger.get(["simplysm", "sd-cli", "createSdNgPlugin"]);

  function debug(...msg: any[]): void {
    logger.debug(`[${path.basename(conf.pkgPath)}]`, ...msg);
  }

  return {
    name: "sd-ng-compile",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
        watchScopePaths: conf.watchScopePaths,
        /*processWebWorker: (workerFile, containingFile) => {
          const fullWorkerPath = path.join(path.dirname(containingFile), workerFile);
          const workerResult = build.esbuild.buildSync({
            ...build.initialOptions,
            platform: "browser",
            write: false,
            bundle: true,
            metafile: true,
            format: "esm",
            entryNames: "worker-[hash]",
            entryPoints: [fullWorkerPath],
            supported: undefined,
            plugins: undefined,
            // plugins: build.initialOptions.plugins?.filter((item) => item.name !== "sd-ng-compile"),
          });

          const dependencySet = new Set<TNormPath>();

          if (workerResult.errors.length > 0) {
            dependencySet.adds(
              ...workerResult.errors
                .map((error) => error.location?.file)
                .filterExists()
                .map((file) => PathUtil.norm(build.initialOptions.absWorkingDir ?? "", file)),
            );
          } else {
            dependencySet.adds(
              ...Object.keys(workerResult.metafile.inputs).map((input) =>
                PathUtil.norm(build.initialOptions.absWorkingDir ?? "", input),
              ),
            );
          }

          for (const dep of dependencySet) {
            const depCache = workerRevDepMap.getOrCreate(dep, new Set<TNormPath>());
            depCache.add(PathUtil.norm(containingFile));
          }

          webWorkerResultMap.set(PathUtil.norm(fullWorkerPath), {
            outputFiles: workerResult.outputFiles,
            metafile: workerResult.metafile,
            warnings: workerResult.warnings,
            errors: workerResult.errors,
          });

          const workerCodeFile = workerResult.outputFiles.single((file) =>
            /^worker-[A-Z0-9]{8}.[cm]?js$/.test(path.basename(file.path)),
          )!;
          const workerCodePath = path.relative(build.initialOptions.outdir ?? "", workerCodeFile.path);

          return workerCodePath.replaceAll("\\", "/");
        },*/
      });

      let tsCompileResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<TNormPath, Uint8Array>();

      // const cacheStore = new LmbdCacheStore(path.join(process.cwd(), "angular-compiler.db"));
      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer(
        {
          thirdPartySourcemaps: conf.dev,
          sourcemap: false,//conf.dev,
          jit: false,
          advancedOptimizations: true,
        },
        os.cpus().length,
        // cacheStore.createCache("jstransformer"),
      );

      //---------------------------

      build.onStart(async () => {
        perf = new SdCliPerformanceTimer("esbuild");

        const res = await perf.run("typescript build", async () => {
          for (const modifiedFile of conf.modifiedFileSet) {
            outputContentsCacheMap.delete(modifiedFile);

            /*if (workerRevDepMap.has(modifiedFile)) {
              for (const workerContainingFile of workerRevDepMap.get(modifiedFile)!) {
                outputContentsCacheMap.delete(workerContainingFile);
                conf.modifiedFileSet.add(workerContainingFile);
              }
            }*/
          }

          tsCompileResult = await tsCompiler.compileAsync(conf.modifiedFileSet);

          conf.result.watchFileSet = tsCompileResult.watchFileSet;
          conf.result.affectedFileSet = tsCompileResult.affectedFileSet;

          const tsEsbuildResult = SdCliConvertMessageUtils.convertToEsbuildFromBuildMessages(
            tsCompileResult.messages,
            conf.pkgPath,
          );
          //-- return err/warn
          return {
            errors: [
              ...tsEsbuildResult.errors,
              ...Array.from(tsCompileResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.errors)
                .filterExists(),
              ...Array.from(webWorkerResultMap.values())
                .flatMap((item) => item.errors)
                .filterExists(),
            ].filterExists(),
            warnings: [
              ...tsEsbuildResult.warnings,
              ...Array.from(tsCompileResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.warnings)
                .filterExists(),
              ...Array.from(webWorkerResultMap.values())
                .flatMap((item) => item.warnings)
                .filterExists(),
            ],
          };
        });

        perf.start("transform & bundling");
        return res;
      });

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const emittedJsFile = tsCompileResult.emittedFilesCacheMap.get(PathUtils.norm(args.path))?.last();
        if (!emittedJsFile) {
          return {
            errors: [
              {
                text: `ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`,
              },
            ],
          };
        }

        const contents = emittedJsFile.text;

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await javascriptTransformer.transformData(args.path, contents, true, sideEffects);

        outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

        return { contents: newContents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        conf.result.watchFileSet!.add(PathUtils.norm(args.path));

        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await javascriptTransformer.transformFile(args.path, false, sideEffects);

        outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

        return {
          contents: newContents,
          loader: "js",
        };
      });

      build.onLoad(
        {
          filter: new RegExp(
            "(" +
              Object.keys(build.initialOptions.loader!)
                .map((item) => "\\" + item)
                .join("|") +
              ")$",
          ),
        },
        (args) => {
          conf.result.watchFileSet!.add(PathUtils.norm(args.path));
          return null;
        },
      );

      build.onEnd((result) => {
        perf.end("transform & bundling");
        debug(perf.toString());

        for (const { outputFiles, metafile } of tsCompileResult.stylesheetBundlingResultMap.values()) {
          result.outputFiles ??= [];
          result.outputFiles.push(...outputFiles ?? []);

          if (result.metafile && metafile) {
            result.metafile.inputs = { ...result.metafile.inputs, ...metafile.inputs };
            result.metafile.outputs = { ...result.metafile.outputs, ...metafile.outputs };
          }
        }

        for (const { outputFiles, metafile } of webWorkerResultMap.values()) {
          result.outputFiles ??= [];
          result.outputFiles.push(...outputFiles);

          if (result.metafile && metafile) {
            result.metafile.inputs = { ...result.metafile.inputs, ...metafile.inputs };
            result.metafile.outputs = { ...result.metafile.outputs, ...metafile.outputs };
          }
        }

        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;

        conf.modifiedFileSet.clear();
      });
    },
  };
}
