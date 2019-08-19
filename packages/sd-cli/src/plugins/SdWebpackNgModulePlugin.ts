import * as webpack from "webpack";
import {SdWebpackAngularWatchFileSystem} from "./SdWebpackAngularWatchFileSystem";
import * as os from "os";
import {SdTypescriptProgram} from "../SdTypescriptProgram";
import * as path from "path";
import * as glob from "glob";

export class SdWebpackNgModulePlugin implements webpack.Plugin {
  public constructor(private readonly _options: { tsConfigPath: string; jit: boolean }) {
  }

  public apply(compiler: webpack.Compiler): void {
    if (this._options.jit) {
      compiler.hooks.environment.tap("SdWebpackNgModulePlugin", () => {
        const program = new SdTypescriptProgram(this._options.tsConfigPath, {});

        {
          program.clearNgModules();
          const messages = program.emitNgModule().messages;
          messages.push(...program.emitNgRoutingModule().messages);
          program.emitRoutesRoot();

          if (messages.length > 0) {
            throw new Error(messages.distinct().join(os.EOL));
          }
        }

        const prevWatch = compiler["watchFileSystem"].watch;
        compiler["watchFileSystem"].watch = (files: string[],
                                             dirs: string[],
                                             missing: string[],
                                             startTime: number | undefined,
                                             options: {},
                                             callback: any,
                                             callbackUndelayed: (...args: any[]) => void): any => {

          let undelayedChanged: string[] = [];
          const newCallbackUndelayed = (...args: any[]) => {
            if (typeof args[0] === "string") {
              callbackUndelayed(args[0], args[1]);
              undelayedChanged.push(args[0]);
            }
            else {
              callbackUndelayed(...args);
            }
          };

          const newCallback = async (
            err: Error | null,
            filesModified: string[],
            contextModified: string[],
            missingModified: string[],
            fileTimestamps: Map<string, number>,
            contextTimestamps: Map<string, number>
          ) => {
            const changeInfos = filesModified
              .concat(contextModified.filter(item => item.endsWith(".ts")))
              .concat(undelayedChanged)
              .filter(item => !item.endsWith(".map"))
              .map(item => path.normalize(item).replace(/\.js$/, ".d.ts"))
              .distinct()
              .map(item => ({
                type: "change" as "change",
                filePath: item
              }));
            undelayedChanged = [];

            const reloadedFileChangeInfos = program.applyChanges(changeInfos, {});
            let newFileModified = reloadedFileChangeInfos.map(item => item.filePath);

            const emitNgModuleResult = program.emitNgModule(newFileModified);
            const emitNgRoutingModuleResult = program.emitNgRoutingModule(newFileModified);
            const emitRoutesRootResult = program.emitRoutesRoot(newFileModified);
            newFileModified.push(
              ...(emitRoutesRootResult ? [emitRoutesRootResult] : [])
                .concat(emitNgModuleResult.changedModuleFilePaths)
                .concat(emitNgRoutingModuleResult.changedRoutingModuleFilePaths)
            );
            newFileModified = newFileModified
              .map(item => item.replace(/\.d\.ts$/, ".js"))
              .distinct();

            const messages = emitNgModuleResult.messages.concat(emitNgRoutingModuleResult.messages);

            if (messages.length > 0) {
              throw new Error(messages.distinct().join(os.EOL));
            }

            const maxTimestamp = Array.from(fileTimestamps.values()).max()!;
            for (const filesModifiedItem of newFileModified) {
              fileTimestamps.set(filesModifiedItem, maxTimestamp);
            }

            callback(
              err,
              newFileModified,
              contextModified,
              missingModified,
              fileTimestamps,
              contextTimestamps
            );
          };

          return prevWatch.call(
            compiler["watchFileSystem"],
            files.map(item => path.resolve(item)).distinct(),
            [...dirs, ...glob.sync(path.resolve(program.rootDirPath, "**") + "\\")].map(item => path.resolve(item)).distinct(),
            missing,
            startTime,
            options,
            newCallback,
            newCallbackUndelayed
          );
        };
      });
    }
    else {
      compiler.hooks.afterEnvironment.tap("SdWebpackNgModulePlugin", () => {
        const prevWatchFileSystem = compiler["watchFileSystem"];

        compiler["watchFileSystem"] = new SdWebpackAngularWatchFileSystem(
          prevWatchFileSystem._virtualInputFileSystem,
          prevWatchFileSystem._replacements,
          this._options.tsConfigPath
        );
      });
    }
  }
}
