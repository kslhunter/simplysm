import esbuild from "esbuild";
import ts from "typescript";
import path from "path";
import os from "os";
import {ISdTsCompilerResult, SdTsCompiler} from "../build-tools/SdTsCompiler";
import {JavaScriptTransformer} from "@ngbuild/tools/esbuild/javascript-transformer";
import {convertTypeScriptDiagnostic} from "@ngbuild/tools/esbuild/angular/diagnostics";

export function sdNgPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: INgPluginResultCache;
}): esbuild.Plugin {
  return {
    name: "sd-ng-compiler",
    setup: (build: esbuild.PluginBuild) => {
      const compiler = new SdTsCompiler(conf.pkgPath, {declaration: false}, conf.dev);

      let buildResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<string, Uint8Array>();

      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer({
        thirdPartySourcemaps: conf.dev,
        sourcemap: true, //conf.dev,
        jit: false,
        advancedOptimizations: true
      }, os.cpus().length);

      //---------------------------

      build.onStart(async () => {
        compiler.invalidate(conf.modifiedFileSet);
        for (const modifiedFile of conf.modifiedFileSet) {
          outputContentsCacheMap.delete(modifiedFile);
        }

        buildResult = await compiler.buildAsync();

        conf.result.watchFileSet = buildResult.watchFileSet;
        conf.result.affectedFileSet = buildResult.affectedFileSet;
        conf.result.program = buildResult.program;

        //-- return err/warn
        return {
          errors: [
            ...buildResult.typescriptDiagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
            ...Array.from(buildResult.stylesheetBundlingResultMap.values()).flatMap(item => item.errors)
          ].filterExists(),
          warnings: [
            ...buildResult.typescriptDiagnostics.filter(item => item.category !== ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
            // ...Array.from(buildResult.stylesheetResultMap.values()).flatMap(item => item.warnings)
          ],
        };
      });

      build.onLoad({filter: /\.ts$/}, async (args) => {
        const output = outputContentsCacheMap.get(path.normalize(args.path));
        if (output != null) {
          return {contents: output, loader: "js"};
        }

        const emittedJsFile = buildResult.emittedFilesCacheMap.get(path.normalize(args.path))?.last();
        if (!emittedJsFile) {
          throw new Error(`ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`);
        }

        const contents = emittedJsFile.text;

        const {sideEffects} = await build.resolve(args.path, {
          kind: 'import-statement',
          resolveDir: build.initialOptions.absWorkingDir ?? '',
        });

        const newContents = await javascriptTransformer.transformData(
          args.path,
          contents,
          true,
          sideEffects
        );

        outputContentsCacheMap.set(path.normalize(args.path), newContents);

        return {contents: newContents, loader: "js"};
      });

      build.onLoad(
        {filter: /\.[cm]?js$/},
        async (args) => {
          conf.result.watchFileSet!.add(path.normalize(args.path));

          const output = outputContentsCacheMap.get(path.normalize(args.path));
          if (output != null) {
            return {contents: output, loader: "js"};
          }

          const {sideEffects} = await build.resolve(args.path, {
            kind: 'import-statement',
            resolveDir: build.initialOptions.absWorkingDir ?? '',
          });

          const newContents = await javascriptTransformer.transformFile(
            args.path,
            false,
            sideEffects
          );

          outputContentsCacheMap.set(path.normalize(args.path), newContents);

          return {
            contents: newContents,
            loader: 'js',
          };
        }
      );

      build.onLoad(
        {filter: new RegExp("(" + Object.keys(build.initialOptions.loader!).map(item => "\\" + item).join("|") + ")$")},
        (args) => {
          conf.result.watchFileSet!.add(path.normalize(args.path));
          return null;
        }
      );

      build.onEnd((result) => {
        for (const {outputFiles, metafile} of buildResult.stylesheetBundlingResultMap.values()) {
          result.outputFiles = result.outputFiles ?? [];
          result.outputFiles.push(...outputFiles);

          if (result.metafile && metafile) {
            result.metafile.inputs = {...result.metafile.inputs, ...metafile.inputs};
            result.metafile.outputs = {...result.metafile.outputs, ...metafile.outputs};
          }
        }

        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;

        conf.modifiedFileSet.clear();
      });
    }
  };
}

export interface INgPluginResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  program?: ts.Program;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
}