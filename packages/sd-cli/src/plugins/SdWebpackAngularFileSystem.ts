import {getSystemPath, normalize, Path} from "@angular-devkit/core";
import {NodeWatchFileSystem, VirtualFileSystemDecorator} from "@ngtools/webpack/src/virtual_file_system_decorator";
import * as glob from "glob";
import * as path from "path";
import {SdTypescriptProgram} from "../SdTypescriptProgram";
import * as os from "os";


export class SdWebpackAngularFileSystem extends NodeWatchFileSystem {
  private readonly _program: SdTypescriptProgram;

  public constructor(private readonly _virtualInputFileSystem: VirtualFileSystemDecorator,
                     private readonly _replacements: Map<Path, Path> | ((path: Path) => Path),
                     private readonly _tsConfigPath: string) {
    super(_virtualInputFileSystem);

    this._program = new SdTypescriptProgram(this._tsConfigPath, {});
    const messages = this._program.emitNgModule();
    if (messages.length > 0) {
      throw new Error(messages.join(os.EOL));
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

    const newCallbackUndelayed = (...args: any[]) => {
      if (typeof args[0] === "string") {
        const original = reverseReplacements.get(args[0]);
        if (original) {
          this._virtualInputFileSystem.purge(original);
          callbackUndelayed(original, args[1]);
        }
        else {
          callbackUndelayed(args[0], args[1]);
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
      this._virtualInputFileSystem.purge(filesModified);

      // Update fileTimestamps with timestamps from virtual files.
      const virtualFilesStats = this._virtualInputFileSystem.getVirtualFilesPaths()
        .map(fileName => ({
          path: fileName,
          mtime: +this._virtualInputFileSystem.statSync(fileName).mtime
        }));
      virtualFilesStats.forEach(stats => fileTimestamps.set(stats.path, +stats.mtime));

      callback(
        err,
        filesModified.map(value => reverseReplacements.get(value) || value),
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
      mapReplacements([...dirs, ...glob.sync(path.resolve(this._program.rootDirPath, "**"))].distinct()),
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
