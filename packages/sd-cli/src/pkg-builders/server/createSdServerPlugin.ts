import esbuild from "esbuild";
import { SdCliConvertMessageUtil } from "../../utils/SdCliConvertMessageUtil";
import { ISdCliServerPluginResultCache } from "../../types/build-plugin.type";
import { PathUtil, TNormPath } from "@simplysm/sd-core-node";
import { ISdTsCompilerResult } from "../../types/ts-compiler.type";
import { SdTsCompiler } from "../../ts-builder/SdTsCompiler";

export function createSdServerPlugin(conf: {
  pkgPath: TNormPath;
  dev: boolean;
  modifiedFileSet: Set<TNormPath>;
  result: ISdCliServerPluginResultCache;
  watchScopePaths: TNormPath[];
}): esbuild.Plugin {
  return {
    name: "sd-server-compile",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
        watchScopePaths: conf.watchScopePaths,
      });

      let tsCompileResult: ISdTsCompilerResult;

      build.onStart(async () => {
        tsCompileResult = await tsCompiler.compileAsync(conf.modifiedFileSet);

        conf.result.watchFileSet = tsCompileResult.watchFileSet;
        conf.result.affectedFileSet = tsCompileResult.affectedFileSet;

        //-- return err/warn
        return SdCliConvertMessageUtil.convertToEsbuildFromBuildMessages(tsCompileResult.messages, conf.pkgPath);
      });

      build.onLoad({ filter: /\.ts$/ }, (args) => {
        const emittedJsFile = tsCompileResult.emittedFilesCacheMap.get(PathUtil.norm(args.path))?.last();
        if (!emittedJsFile) {
          throw new Error(`ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`);
        }

        const contents = emittedJsFile.text;
        return { contents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, (args) => {
        conf.result.watchFileSet!.add(PathUtil.norm(args.path));
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
          conf.result.watchFileSet!.add(PathUtil.norm(args.path));
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
