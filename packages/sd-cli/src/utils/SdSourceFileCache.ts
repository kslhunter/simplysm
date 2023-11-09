import {SdMemoryLoadResultCache} from "./SdMemoryLoadResultCache";
import {SourceFileCache} from "@angular-devkit/build-angular/src/tools/esbuild/angular/source-file-cache";

export class SdSourceFileCache extends SourceFileCache {
  override readonly loadResultCache = new SdMemoryLoadResultCache();

  override invalidate(files: Iterable<string>): void {
    super.invalidate(files);

    for (let file of files) {
      this.loadResultCache.invalidate(file);
    }
  }
}