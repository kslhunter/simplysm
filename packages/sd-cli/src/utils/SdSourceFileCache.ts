import {SdMemoryLoadResultCache} from "./SdMemoryLoadResultCache";
import {SourceFileCache} from "@angular-devkit/build-angular/src/tools/esbuild/angular/source-file-cache";
import {pathToFileURL} from "url";

export class SdSourceFileCache extends SourceFileCache {
  override readonly loadResultCache = new SdMemoryLoadResultCache();

  override invalidate(files: Iterable<string>): void {
    if (files !== this.modifiedFiles) {
      this.modifiedFiles.clear();
    }
    for (let file of files) {
      this.babelFileCache.delete(file);
      this.typeScriptFileCache.delete(pathToFileURL(file).href);
      this.loadResultCache.invalidate(file);

      this.delete(file);
      this.modifiedFiles.add(file);
    }
  }
}