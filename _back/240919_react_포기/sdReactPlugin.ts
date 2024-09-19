import esbuild from "esbuild";
import ts from "typescript";
import path from "path";
import { ISdTsCompilerResult, SdTsCompiler } from "../build-tools/SdTsCompiler";
import { convertTypeScriptDiagnostic } from "@angular/build/src/tools/esbuild/angular/diagnostics";
import postcss from "postcss";
import { FsUtil } from "@simplysm/sd-core-node";
import postcssUrl from "postcss-url";
import postcssHas from "css-has-pseudo";
import autoprefixer from "autoprefixer";

export function sdReactPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: IReactPluginResultCache;
}): esbuild.Plugin {
  return {
    name: "sd-ng-compiler",
    setup: (build: esbuild.PluginBuild) => {
      const compiler = new SdTsCompiler(conf.pkgPath, { declaration: false }, conf.dev);

      let buildResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<string, string | Uint8Array | undefined>();

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
            ...buildResult.typescriptDiagnostics
              .filter((item) => item.category === ts.DiagnosticCategory.Error)
              .map((item) => convertTypeScriptDiagnostic(ts, item)),
            ...Array.from(buildResult.stylesheetBundlingResultMap.values()).flatMap((item) => item.errors),
          ].filterExists(),
          warnings: [
            ...buildResult.typescriptDiagnostics
              .filter((item) => item.category !== ts.DiagnosticCategory.Error)
              .map((item) => convertTypeScriptDiagnostic(ts, item)),
            // ...Array.from(buildResult.stylesheetResultMap.values()).flatMap(item => item.warnings)
          ],
        };
      });

      build.onLoad({ filter: /\.tsx?$/ }, (args) => {
        const output = outputContentsCacheMap.get(path.normalize(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const emittedJsFile = buildResult.emittedFilesCacheMap.get(path.normalize(args.path))?.last();
        if (!emittedJsFile) {
          throw new Error(`ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`);
        }

        const contents = emittedJsFile.text;

        outputContentsCacheMap.set(path.normalize(args.path), contents);

        return { contents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?jsx?$/ }, (args) => {
        conf.result.watchFileSet!.add(path.normalize(args.path));
        return null;
      });

      build.onLoad({ filter: /\.css$/ }, async (args) => {
        conf.result.watchFileSet!.add(path.normalize(args.path));
        const output = outputContentsCacheMap.get(path.normalize(args.path));
        if (output != null) {
          return {
            contents: output,
            loader: "file",
          };
        }

        const css = await FsUtil.readFileAsync(path.normalize(args.path));
        const result = await postcss()
          .use(
            autoprefixer({
              overrideBrowserslist: ["Chrome > 78"]
            })
          )
          .use(
            postcssUrl({
              url: "copy",
            }),
          )
          .use(
            postcssHas()
          )
          .process(css, {
            from: path.normalize(args.path),
            to: path.resolve(conf.pkgPath, "dist", "media", path.basename(args.path)),
          });

        outputContentsCacheMap.set(path.normalize(args.path), result.css);

        return { contents: result.css, loader: "file" };
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
        for (const { outputFiles, metafile } of buildResult.stylesheetBundlingResultMap.values()) {
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

export interface IReactPluginResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  program?: ts.Program;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
}
