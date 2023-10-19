import {SourceFileCache} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin";
import {SdMemoryLoadResultCache} from "./SdMemoryLoadResultCache";

export class SdSourceFileCache extends SourceFileCache {
  override readonly loadResultCache = new SdMemoryLoadResultCache();
}