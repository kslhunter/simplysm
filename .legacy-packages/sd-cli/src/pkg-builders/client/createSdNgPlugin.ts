import type esbuild from "esbuild";
import path from "path";
import os from "os";
import { JavaScriptTransformer } from "@angular/build/src/tools/esbuild/javascript-transformer";
import type { TNormPath } from "@simplysm/sd-core-node";
import { FsUtils, PathUtils, SdLogger } from "@simplysm/sd-core-node";
import { SdCliPerformanceTimer } from "../../utils/SdCliPerformanceTimer";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";
import { SdTsCompiler } from "../../ts-compiler/SdTsCompiler";
import type { ISdCliNgPluginResultCache } from "../../types/plugin/ISdCliNgPluginResultCache";
import type { ISdTsCompilerResult } from "../../types/build/ISdTsCompilerResult";
import type { ISdTsCompilerOptions } from "../../types/build/ISdTsCompilerOptions";

export function createSdNgPlugin(
  opt: ISdTsCompilerOptions,
  modifiedFileSet: Set<TNormPath>,
  resultCache: ISdCliNgPluginResultCache,
): esbuild.Plugin {
  let perf: SdCliPerformanceTimer;
  const logger = SdLogger.get(["simplysm", "sd-cli", "createSdNgPlugin"]);

  const debug = (...msg: any[]) => {
    logger.debug(`[${path.basename(opt.pkgPath)}]`, ...msg);
  };

  return {
    name: "sd-ng-plugin",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler(opt, true);

      let tsCompileResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<TNormPath, Uint8Array>();

      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer(
        {
          thirdPartySourcemaps: !!opt.watch?.dev,
          sourcemap: !!opt.watch?.dev,
          jit: false,
          advancedOptimizations: !opt.watch?.dev,
        },
        Math.floor((os.cpus().length * 2) / 3),
      );

      //---------------------------

      build.onStart(async () => {
        perf = new SdCliPerformanceTimer("esbuild");

        const res = await perf.run("typescript build", async () => {
          for (const modifiedFile of modifiedFileSet) {
            outputContentsCacheMap.delete(modifiedFile);
          }

          tsCompileResult = await tsCompiler.compileAsync(modifiedFileSet);

          resultCache.watchFileSet = tsCompileResult.watchFileSet;
          resultCache.affectedFileSet = tsCompileResult.affectedFileSet;

          const tsEsbuildResult = SdCliConvertMessageUtils.convertToEsbuildFromBuildMessages(
            tsCompileResult.messages,
            opt.pkgPath,
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

        perf.start("esbuild transform & bundling");
        return res;
      });

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const emittedFiles = tsCompileResult.emittedFilesCacheMap.get(PathUtils.norm(args.path));

        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const contents = emittedFiles?.last()?.text ?? "";

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await perf.run("esbuild transform:js:*.ts", async () => {
          return await javascriptTransformer.transformData(args.path, contents, true, sideEffects);
        });

        outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

        return { contents: newContents, loader: "js" };
      });

      build.onLoad({ filter: /\.mjs$/ }, async (args) => {
        resultCache.watchFileSet!.add(PathUtils.norm(args.path));

        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        try {
          const newContents = await perf.run("esbuild transform:js:*.js", async () => {
            const contents = await FsUtils.readFileBufferAsync(args.path);

            return await javascriptTransformer.transformData(
              args.path,
              contents.toString(),
              false,
              sideEffects,
            );
          });

          outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

          return {
            contents: newContents,
            loader: "js",
          };
        } catch (err) {
          return { errors: [{ text: err instanceof Error ? err.message : String(err) }] };
        }
      });

      const otherLoaderFilter = new RegExp(
        "(" +
          Object.keys(build.initialOptions.loader ?? {})
            .map((ext) => "\\" + ext)
            .join("|") +
          ")$",
      );
      build.onLoad({ filter: otherLoaderFilter }, (args) => {
        resultCache.watchFileSet!.add(PathUtils.norm(args.path));
        return null;
      });

      build.onEnd((result) => {
        perf.end("esbuild transform & bundling");
        debug(perf.toString());

        for (const stylesheetBundlingResult of tsCompileResult.stylesheetBundlingResultMap.values()) {
          if ("outputFiles" in stylesheetBundlingResult) {
            result.outputFiles ??= [];
            result.outputFiles.push(...stylesheetBundlingResult.outputFiles);

            if (result.metafile) {
              result.metafile.inputs = {
                ...result.metafile.inputs,
                ...stylesheetBundlingResult.metafile.inputs,
              };
              result.metafile.outputs = {
                ...result.metafile.outputs,
                ...stylesheetBundlingResult.metafile.outputs,
              };
            }
          }
        }

        resultCache.outputFiles = result.outputFiles;
        resultCache.metafile = result.metafile;

        modifiedFileSet.clear();
      });
    },
  };
}
