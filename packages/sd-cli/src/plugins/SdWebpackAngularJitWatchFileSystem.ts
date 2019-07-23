import {NodeWatchFileSystem} from "@ngtools/webpack/src/virtual_file_system_decorator";
import * as glob from "glob";
import * as path from "path";
import {SdTypescriptProgram} from "../SdTypescriptProgram";
import * as os from "os";
import {InputFileSystem} from "webpack";


export class SdWebpackAngularJitWatchFileSystem extends NodeWatchFileSystem {
  private readonly _program: SdTypescriptProgram;

  public constructor(inputFileSystem: InputFileSystem,
                     private readonly _tsConfigPath: string) {
    super(inputFileSystem);

    this._program = new SdTypescriptProgram(this._tsConfigPath, {});
    const messages = this._program.emitNgModule().messages;
    messages.push(...this._program.emitNgRoutingModule().messages);
    this._program.emitRoutesRoot();

    if (messages.length > 0) {
      throw new Error(messages.distinct().join(os.EOL));
    }
  }

  public watch(files: string[],
               dirs: string[],
               missing: string[],
               startTime: number | undefined,
               options: {},
               callback: any,
               callbackUndelayed: (...args: any[]) => void): any {

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

      const reloadedFileChangeInfos = this._program.applyChanges(changeInfos, {});
      let newFileModified = reloadedFileChangeInfos.map(item => item.filePath);

      const emitNgModuleResult = this._program.emitNgModule(newFileModified);
      const emitNgRoutingModuleResult = this._program.emitNgRoutingModule(newFileModified);
      const emitRoutesRootResult = this._program.emitRoutesRoot(newFileModified);
      newFileModified.push(
        ...(emitRoutesRootResult ? [emitRoutesRootResult] : [])
          .concat(emitNgModuleResult.changedModuleFilePaths)
          .concat(emitNgRoutingModuleResult.changedRoutingModuleFilePaths)
      );
      newFileModified = newFileModified.distinct();

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

    return super.watch(
      files.distinct().map(item => path.resolve(item)),
      [...dirs, ...glob.sync(path.resolve(this._program.rootDirPath, "**/"))].distinct().map(item => path.resolve(item)),
      missing,
      startTime,
      options,
      newCallback,
      newCallbackUndelayed
    );
  }
}
