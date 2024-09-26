import esbuild from "esbuild";
import ts from "typescript";
import path from "path";
import { ISdTsCompilerResult, SdTsCompiler } from "../build-tools/SdTsCompiler";
import { convertTypeScriptDiagnostic } from "@angular/build/src/tools/esbuild/angular/diagnostics";

export function sdServerPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: IServerPluginResultCache;
}): esbuild.Plugin {
  return {
    name: "sd-server-compiler",
    setup: (build: esbuild.PluginBuild) => {
      const compiler = new SdTsCompiler({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
      });

      let buildResult: ISdTsCompilerResult;

      build.onStart(async () => {
        compiler.invalidate(conf.modifiedFileSet);
        buildResult = await compiler.buildAsync();

        conf.result.watchFileSet = buildResult.watchFileSet;
        conf.result.affectedFileSet = buildResult.affectedFileSet;
        conf.result.program = buildResult.program;

        //-- return err/warn

        return {
          errors: buildResult.typescriptDiagnostics
            .filter((item) => item.category === ts.DiagnosticCategory.Error)
            .map((item) => convertTypeScriptDiagnostic(ts, item)),
          warnings: buildResult.typescriptDiagnostics
            .filter((item) => item.category !== ts.DiagnosticCategory.Error)
            .map((item) => convertTypeScriptDiagnostic(ts, item)),
        };
      });

      build.onLoad({ filter: /\.ts$/ }, (args) => {
        const emittedJsFile = buildResult.emittedFilesCacheMap.get(path.normalize(args.path))?.last();
        if (!emittedJsFile) {
          throw new Error(`ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`);
        }

        const contents = emittedJsFile.text;
        return { contents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, (args) => {
        conf.result.watchFileSet!.add(path.normalize(args.path));
        return null;
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
        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;

        conf.modifiedFileSet.clear();
      });
    },
  };
}

export interface IServerPluginResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  program?: ts.Program;
}
