import esbuild from "esbuild";
import path from "path";
import os from "os";
import { JavaScriptTransformer } from "@angular/build/src/tools/esbuild/javascript-transformer";
import { Logger, PathUtil, TNormPath } from "@simplysm/sd-core-node";
import { SdCliPerformanceTimer } from "../../utils/SdCliPerformanceTime";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { ISdCliNgPluginResultCache } from "../../types/build-plugin.type";
import { ISdTsCompilerResult } from "../../types/ts-compiler.type";
import { SdTsCompiler } from "../../ts-builder/SdTsCompiler";

export function createSdNgPlugin(conf: {
  pkgPath: TNormPath;
  dev: boolean;
  modifiedFileSet: Set<TNormPath>;
  result: ISdCliNgPluginResultCache;
  watchScopePaths: TNormPath[];
}): esbuild.Plugin {
  let perf: SdCliPerformanceTimer;
  const logger = Logger.get(["simplysm", "sd-cli", "createSdNgPlugin"]);

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
      });

      let tsCompileResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<TNormPath, Uint8Array>();

      // const cacheStore = new LmbdCacheStore(path.join(process.cwd(), "angular-compiler.db"));
      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer(
        {
          thirdPartySourcemaps: conf.dev,
          sourcemap: true, //conf.dev,
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
          }

          tsCompileResult = await tsCompiler.compileAsync(conf.modifiedFileSet);

          conf.result.watchFileSet = tsCompileResult.watchFileSet;
          conf.result.affectedFileSet = tsCompileResult.affectedFileSet;

          const tsEsbuildResult = SdCliConvertMessageUtil.convertToEsbuildFromBuildMessages(
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
            ].filterExists(),
            warnings: [
              ...tsEsbuildResult.warnings,
              ...Array.from(tsCompileResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.warnings)
                .filterExists(),
            ],
          };
        });

        perf.start("transform & bundling");
        return res;
      });

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const output = outputContentsCacheMap.get(PathUtil.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const emittedJsFile = tsCompileResult.emittedFilesCacheMap.get(PathUtil.norm(args.path))?.last();
        if (!emittedJsFile) {
          throw new Error(`ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`);
        }

        const contents = emittedJsFile.text;

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await javascriptTransformer.transformData(args.path, contents, true, sideEffects);

        outputContentsCacheMap.set(PathUtil.norm(args.path), newContents);

        return { contents: newContents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        conf.result.watchFileSet!.add(PathUtil.norm(args.path));

        const output = outputContentsCacheMap.get(PathUtil.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await javascriptTransformer.transformFile(args.path, false, sideEffects);

        outputContentsCacheMap.set(PathUtil.norm(args.path), newContents);

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
          conf.result.watchFileSet!.add(PathUtil.norm(args.path));
          return null;
        },
      );

      build.onEnd((result) => {
        perf.end("transform & bundling");
        debug(perf.toString());

        for (const { outputFiles, metafile } of tsCompileResult.stylesheetBundlingResultMap.values()) {
          result.outputFiles = result.outputFiles ?? [];
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
