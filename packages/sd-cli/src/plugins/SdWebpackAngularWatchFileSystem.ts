import {getSystemPath, normalize, Path} from "@angular-devkit/core";
import {NodeWatchFileSystem, VirtualFileSystemDecorator} from "@ngtools/webpack/src/virtual_file_system_decorator";
import * as glob from "glob";
import * as path from "path";
import {SdTypescriptProgram} from "../SdTypescriptProgram";
import * as os from "os";


export class SdWebpackAngularWatchFileSystem extends NodeWatchFileSystem {
  private readonly _program: SdTypescriptProgram;

  public constructor(private readonly _virtualInputFileSystem: VirtualFileSystemDecorator,
                     private readonly _replacements: Map<Path, Path> | ((path: Path) => Path),
                     private readonly _tsConfigPath: string) {
    super(_virtualInputFileSystem);

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
    const reverseReplacements = new Map<string, string>();
    const reverseTimestamps = (map: Map<string, number>) => {
      for (const entry of Array.from(map.entries())) {
        const original = reverseReplacements.get(entry[0]);
        if (original) {
          map.set(original, entry[1]);
          map.delete(entry[0]);
        }
      }

      return map;
    };

    let undelayedChanged: string[] = [];
    const newCallbackUndelayed = (...args: any[]) => {
      if (typeof args[0] === "string") {
        const original = reverseReplacements.get(args[0]);
        if (original) {
          this._virtualInputFileSystem.purge(original);
          callbackUndelayed(original, args[1]);
          undelayedChanged.push(original);
        }
        else {
          callbackUndelayed(args[0], args[1]);
          undelayedChanged.push(args[0]);
        }
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
        .filter(item => item.endsWith(".map"))
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

      this._virtualInputFileSystem.purge(newFileModified);

      // Update fileTimestamps with timestamps from virtual files.
      const virtualFilesStats = this._virtualInputFileSystem.getVirtualFilesPaths()
        .map(fileName => ({
          path: fileName,
          mtime: +this._virtualInputFileSystem.statSync(fileName).mtime
        }));
      virtualFilesStats.forEach(stats => fileTimestamps.set(stats.path, +stats.mtime));

      callback(
        err,
        newFileModified.map(value => reverseReplacements.get(value) || value),
        contextModified.map(value => reverseReplacements.get(value) || value),
        missingModified.map(value => reverseReplacements.get(value) || value),
        reverseTimestamps(fileTimestamps),
        reverseTimestamps(contextTimestamps)
      );
    };

    const mapReplacements = (original: string[]): string[] => {
      if (!this._replacements) {
        return original;
      }
      const replacements = this._replacements;

      return original.map(file => {
        if (typeof replacements === "function") {
          const replacement = getSystemPath(replacements(normalize(file)));
          if (replacement !== file) {
            reverseReplacements.set(replacement, file);
          }

          return replacement;
        }
        else {
          const replacement = replacements.get(normalize(file));
          if (replacement) {
            const fullReplacement = getSystemPath(replacement);
            reverseReplacements.set(fullReplacement, file);

            return fullReplacement;
          }
          else {
            return file;
          }
        }
      });
    };

    const watcher = super.watch(
      mapReplacements(files),
      mapReplacements([...dirs, ...glob.sync(path.resolve(this._program.rootDirPath, "**/"))].distinct()),
      mapReplacements(missing),
      startTime,
      options,
      newCallback,
      newCallbackUndelayed
    );

    return {
      close: () => watcher.close(),
      pause: () => watcher.pause(),
      getFileTimestamps: () => reverseTimestamps(watcher.getFileTimestamps()),
      getContextTimestamps: () => reverseTimestamps(watcher.getContextTimestamps())
    };
  }
}
