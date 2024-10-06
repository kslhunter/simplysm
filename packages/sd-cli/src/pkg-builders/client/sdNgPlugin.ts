import esbuild, { PartialMessage } from "esbuild";
import path from "path";
import os from "os";
import { JavaScriptTransformer } from "@angular/build/src/tools/esbuild/javascript-transformer";
import { Logger } from "@simplysm/sd-core-node";
import { ESLint } from "eslint";
import ts from "typescript";
import { convertTypeScriptDiagnostic } from "@angular/build/src/tools/esbuild/angular/diagnostics";
import { SdCliPerformanceTimer } from "../../utils/SdCliPerformanceTime";
import { SdTsBuilder } from "../../ts-builder/SdTsBuilder";
import { ISdTsCompilerPrepareResult, ISdTsCompilerResult } from "../../ts-builder/SdTsCompiler";

export function sdNgPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: INgPluginResultCache;
  watchScopePaths: string[];
}): esbuild.Plugin {
  let perf: SdCliPerformanceTimer;
  const logger = Logger.get(["simplysm", "sd-cli", "sdNgPlugin"]);

  function debug(...msg: any[]): void {
    logger.debug(`[${path.basename(conf.pkgPath)}]`, ...msg);
  }

  return {
    name: "sd-ng-compile",
    setup: async (build: esbuild.PluginBuild) => {
      const tsBuilder = await SdTsBuilder.new({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
        watchScopePaths: conf.watchScopePaths,
      });

      let tsBuildResult: ISdTsCompilerResult & ISdTsCompilerPrepareResult & { lintResults: ESLint.LintResult[] };
      const outputContentsCacheMap = new Map<string, Uint8Array>();

      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer(
        {
          thirdPartySourcemaps: conf.dev,
          sourcemap: true, //conf.dev,
          jit: false,
          advancedOptimizations: true,
        },
        os.cpus().length,
      );

      //---------------------------

      build.onStart(async () => {
        perf = new SdCliPerformanceTimer("esbuild");

        const res = await perf.run("typescript build", async () => {
          await tsBuilder.invalidateAsync(conf.modifiedFileSet);

          for (const modifiedFile of conf.modifiedFileSet) {
            outputContentsCacheMap.delete(modifiedFile);
          }

          tsBuildResult = await tsBuilder.buildAsync();

          conf.result.watchFileSet = tsBuildResult.watchFileSet;
          conf.result.affectedFileSet = tsBuildResult.affectedFileSet;

          //-- return err/warn
          return {
            errors: [
              ...tsBuildResult.typescriptDiagnostics
                .filter((item) => item.category === ts.DiagnosticCategory.Error)
                .map((item) => convertTypeScriptDiagnostic(ts, item)),
              ...Array.from(tsBuildResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.errors)
                .filterExists(),
              ...tsBuildResult.lintResults.mapMany((r) =>
                r.messages
                  .filter((m) => m.severity !== 1)
                  .map<PartialMessage>((m) => ({
                    id: m.ruleId ?? undefined,
                    pluginName: "lint",
                    text: m.message,
                    location: { file: r.filePath, line: m.line, column: m.column },
                    detail: m,
                  })),
              ),
            ].filterExists(),
            warnings: [
              ...tsBuildResult.typescriptDiagnostics
                .filter((item) => item.category !== ts.DiagnosticCategory.Error)
                .map((item) => convertTypeScriptDiagnostic(ts, item)),
              ...Array.from(tsBuildResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.warnings)
                .filterExists(),
              ...tsBuildResult.lintResults.mapMany((r) =>
                r.messages
                  .filter((m) => m.severity === 1)
                  .map<PartialMessage>((m) => ({
                    id: m.ruleId ?? undefined,
                    pluginName: "lint",
                    text: m.message,
                    location: { file: r.filePath, line: m.line, column: m.column },
                    detail: m,
                  })),
              ),
            ],
          };
        });

        perf.start("transform & bundling");
        return res;
      });

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const output = outputContentsCacheMap.get(path.normalize(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const emittedJsFile = tsBuildResult.emittedFilesCacheMap.get(path.normalize(args.path))?.last();
        if (!emittedJsFile) {
          throw new Error(`ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`);
        }

        const contents = emittedJsFile.text;

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await javascriptTransformer.transformData(args.path, contents, true, sideEffects);

        outputContentsCacheMap.set(path.normalize(args.path), newContents);

        return { contents: newContents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        conf.result.watchFileSet!.add(path.normalize(args.path));

        const output = outputContentsCacheMap.get(path.normalize(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await javascriptTransformer.transformFile(args.path, false, sideEffects);

        outputContentsCacheMap.set(path.normalize(args.path), newContents);

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
          conf.result.watchFileSet!.add(path.normalize(args.path));
          return null;
        },
      );

      build.onEnd((result) => {
        perf.end("transform & bundling");
        debug(perf.toString());

        for (const { outputFiles, metafile } of tsBuildResult.stylesheetBundlingResultMap.values()) {
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

export interface INgPluginResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
}
