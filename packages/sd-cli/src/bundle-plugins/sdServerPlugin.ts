import esbuild from "esbuild";
import ts from "typescript";
import path from "path";
import {convertTypeScriptDiagnostic} from "@angular-devkit/build-angular/src/tools/esbuild/angular/diagnostics";
import {ISdTsCompilerResult, SdTsCompiler} from "../build-tools/SdTsCompiler";

export function sdServerPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: IServerPluginResultCache;
}): esbuild.Plugin {
  return {
    name: "sd-server-compiler",
    setup: (build: esbuild.PluginBuild) => {
      const compiler = new SdTsCompiler(conf.pkgPath, {declaration: false}, conf.dev);

      let buildResult: ISdTsCompilerResult;

      build.onStart(async () => {
        compiler.invalidate(conf.modifiedFileSet);
        buildResult = await compiler.buildAsync();

        conf.result.watchFileSet = buildResult.watchFileSet;
        conf.result.affectedFileSet = buildResult.affectedFileSet;
        conf.result.program = buildResult.program;

        //-- return err/warn

        return {
          errors: buildResult.typescriptDiagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
          warnings: buildResult.typescriptDiagnostics.filter(item => item.category !== ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
        };
      });


      build.onLoad({filter: /\.ts$/}, (args) => {
        const contents = buildResult.emittedFilesCacheMap.get(path.normalize(args.path))!.last()!.text;
        return {contents, loader: "js"};
      });

      build.onLoad({filter: /\.[cm]?js$/}, (args) => {
        conf.result.watchFileSet!.add(path.normalize(args.path));
        return null;
      });

      build.onLoad(
        {filter: new RegExp("(" + Object.keys(build.initialOptions.loader!).map(item => "\\" + item).join("|") + ")$")},
        (args) => {
          conf.result.watchFileSet!.add(path.normalize(args.path));
          return null;
        }
      );

      build.onEnd((result) => {
        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;

        conf.modifiedFileSet.clear();
      });
    }
  };
}

export interface IServerPluginResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  program?: ts.Program;
}