import esbuild from "esbuild";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { ISdCliServerPluginResultCache } from "../../types/build-plugin.types";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { ISdTsCompilerResult } from "../../types/ts-compiler.types";
import { SdTsCompiler } from "../../ts-compiler/sd-ts-compiler";
import { ScopePathSet } from "../commons/scope-path";

export function createSdServerPlugin(conf: {
  pkgPath: TNormPath;
  dev: boolean;
  emitOnly: boolean;
  noEmit: boolean;
  modifiedFileSet: Set<TNormPath>;
  result: ISdCliServerPluginResultCache;
  watchScopePathSet: ScopePathSet;
}): esbuild.Plugin {
  return {
    name: "sd-server-compile",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isNoEmit: conf.noEmit,
        isEmitOnly: conf.emitOnly,
        isForBundle: true,
        watchScopePathSet: conf.watchScopePathSet,
      });

      let tsCompileResult: ISdTsCompilerResult;

      build.onStart(async () => {
        tsCompileResult = await tsCompiler.compileAsync(conf.modifiedFileSet);

        conf.result.watchFileSet = tsCompileResult.watchFileSet;
        conf.result.affectedFileSet = tsCompileResult.affectedFileSet;

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
        if (!emittedJsFile) {
          return {
            errors: [
              {
                text: `ts 빌더 결과 emit 파일이 존재하지 않습니다. ${args.path}`,
              },
            ],
          };
        }

        const contents = emittedJsFile.text;
        return { contents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, (args) => {
        conf.result.watchFileSet!.add(PathUtils.norm(args.path));
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
          conf.result.watchFileSet!.add(PathUtils.norm(args.path));
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
