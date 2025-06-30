import esbuild from "esbuild";
import path from "path";
import os from "os";
import { JavaScriptTransformer } from "@angular/build/src/tools/esbuild/javascript-transformer";
import { PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { SdCliPerformanceTimer } from "../../utils/sd-cli-performance-time";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { ISdCliNgPluginResultCache } from "../../types/build-plugin.types";
import { ISdTsCompilerResult } from "../../types/ts-compiler.types";
import { SdTsCompiler } from "../../ts-compiler/sd-ts-compiler";
import { ScopePathSet } from "../commons/scope-path";

export function createSdNgPlugin(conf: {
  pkgPath: TNormPath;
  dev: boolean;
  modifiedFileSet: Set<TNormPath>;
  result: ISdCliNgPluginResultCache;
  watchScopePathSet: ScopePathSet;
}): esbuild.Plugin {
  let perf: SdCliPerformanceTimer;
  const logger = SdLogger.get(["simplysm", "sd-cli", "createSdNgPlugin"]);

  const debug = (...msg: any[]) => {
    logger.debug(`[${path.basename(conf.pkgPath)}]`, ...msg);
  };

  return {
    name: "sd-ng-compile",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
        watchScopePathSet: conf.watchScopePathSet,
      });

      let tsCompileResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<TNormPath, Uint8Array>();

      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer(
        {
          thirdPartySourcemaps: conf.dev,
          sourcemap: conf.dev,
          jit: false,
          advancedOptimizations: true,
        },
        os.cpus().length,
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
        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const emittedJsFile = tsCompileResult.emittedFilesCacheMap.get(PathUtils.norm(args.path))?.last();
        /*if (!emittedJsFile) {
          return {
            errors: [
              {
                text: `ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`,
              },
            ],
          };
        }
        const contents = emittedJsFile.text;*/

        const contents = emittedJsFile?.text ?? "";

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

        try {
          const newContents = await javascriptTransformer.transformFile(args.path, false, sideEffects);

          outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

          return {
            contents: newContents,
            loader: "js",
          };
        } catch (err) {
          return {
            contents: `console.error(${JSON.stringify(err.message)});`,
            loader: "js",
          };
        }
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

        for (const stylesheetBundlingResult of tsCompileResult.stylesheetBundlingResultMap.values()) {
          if ("outputFiles" in stylesheetBundlingResult) {
            result.outputFiles ??= [];
            result.outputFiles.push(...stylesheetBundlingResult.outputFiles);

            if (result.metafile) {
              result.metafile.inputs = { ...result.metafile.inputs, ...stylesheetBundlingResult.metafile.inputs };
              result.metafile.outputs = { ...result.metafile.outputs, ...stylesheetBundlingResult.metafile.outputs };
            }
          }
        }

        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;

        conf.modifiedFileSet.clear();
      });
    },
  };
}
