import esbuild, { PartialMessage } from "esbuild";
import ts from "typescript";
import path from "path";
import { convertTypeScriptDiagnostic } from "@angular/build/src/tools/esbuild/angular/diagnostics";
import { SdTsBuilder } from "../../ts-builder/SdTsBuilder";

export function sdServerPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: IServerPluginResultCache;
  watchScopePaths: string[];
}): esbuild.Plugin {
  return {
    name: "sd-server-compile",
    setup: async (build: esbuild.PluginBuild) => {
      const tsBuilder = await SdTsBuilder.new({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
        watchScopePaths: conf.watchScopePaths,
      });

      let tsBuildResult: Awaited<ReturnType<SdTsBuilder["buildAsync"]>>;

      build.onStart(async () => {
        await tsBuilder.invalidateAsync(conf.modifiedFileSet);
        tsBuildResult = await tsBuilder.buildAsync();

        conf.result.watchFileSet = tsBuildResult.watchFileSet;
        conf.result.affectedFileSet = tsBuildResult.affectedFileSet;

        //-- return err/warn

        return {
          errors: [
            ...tsBuildResult.typescriptDiagnostics
              .filter((item) => item.category === ts.DiagnosticCategory.Error)
              .map((item) => convertTypeScriptDiagnostic(ts, item)),
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

      build.onLoad({ filter: /\.ts$/ }, (args) => {
        const emittedJsFile = tsBuildResult.emittedFilesCacheMap.get(path.normalize(args.path))?.last();
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
}
