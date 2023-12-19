import esbuild from "esbuild";
import {FsUtil} from "@simplysm/sd-core-node";
import ts from "typescript";
import path from "path";

export function sdTscPlugin(conf: {
  parsedTsconfig: ts.ParsedCommandLine;
}): esbuild.Plugin {
  return {
    name: "sd-tsc",
    setup: (build: esbuild.PluginBuild) => {
      if (conf.parsedTsconfig.options.emitDecoratorMetadata) {
        build.onLoad({filter: /\.ts$/}, async (args) => {

          const fileContent = await FsUtil.readFileAsync(args.path);
          const program = ts.transpileModule(fileContent, {
            compilerOptions: conf.parsedTsconfig.options,
            fileName: path.basename(args.path),
          });
          return {contents: program.outputText};
        });
      }
    }
  };
}