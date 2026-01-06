import type esbuild from "esbuild";
import { SdCliConvertMessageUtils } from "../../utils/SdCliConvertMessageUtils";
import type { TNormPath } from "@simplysm/sd-core-node";
import { PathUtils } from "@simplysm/sd-core-node";
import { SdTsCompiler } from "../../ts-compiler/SdTsCompiler";
import type { ISdCliServerPluginResultCache } from "../../types/plugin/ISdCliServerPluginResultCache";
import type { ISdTsCompilerResult } from "../../types/build/ISdTsCompilerResult";
import type { ISdTsCompilerOptions } from "../../types/build/ISdTsCompilerOptions";

export function createSdServerPlugin(
  conf: ISdTsCompilerOptions,
  modifiedFileSet: Set<TNormPath>,
  resultCache: ISdCliServerPluginResultCache,
): esbuild.Plugin {
  return {
    name: "sd-server-plugin",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler(conf, true);

      let tsCompileResult: ISdTsCompilerResult;

      build.onStart(async () => {
        tsCompileResult = await tsCompiler.compileAsync(modifiedFileSet);

        resultCache.watchFileSet = tsCompileResult.watchFileSet;
        resultCache.affectedFileSet = tsCompileResult.affectedFileSet;

        //-- return err/warn
        return SdCliConvertMessageUtils.convertToEsbuildFromBuildMessages(
          tsCompileResult.messages,
          conf.pkgPath,
        );
      });

      build.onLoad({ filter: /\.ts$/ }, (args) => {
        const emittedJsFile = tsCompileResult.emittedFilesCacheMap
          .get(PathUtils.norm(args.path))
          ?.last();
        /*if (!emittedJsFile) {
          return {
            errors: [
              {
                text: `ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`,
              },
            ],
          };
        }*/

        return { contents: emittedJsFile?.text, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, (args) => {
        resultCache.watchFileSet!.add(PathUtils.norm(args.path));
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
          resultCache.watchFileSet!.add(PathUtils.norm(args.path));
          return null;
        },
      );

      build.onEnd((result) => {
        resultCache.outputFiles = result.outputFiles;
        resultCache.metafile = result.metafile;

        modifiedFileSet.clear();
      });
    },
  };
}
