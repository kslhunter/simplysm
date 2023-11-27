import {MemoryLoadResultCache} from "@angular-devkit/build-angular/src/tools/esbuild/load-result-cache";
import {OnLoadResult} from 'esbuild';
import path from "path";

export class SdMemoryLoadResultCache extends MemoryLoadResultCache {
  #loadResults = new Map<string, OnLoadResult>();
  #fileDependencies = new Map<string, Set<string>>();

  override get(getPath: string): OnLoadResult | undefined {
    return this.loadResults.get(getPath);
  }

  override put(putPath: string, result: OnLoadResult): Promise<void> {
    this.loadResults.set(putPath, result);
    if (result.watchFiles) {
      for (const watchFile of result.watchFiles) {
        const watchFilePath = path.resolve(watchFile);
        let affected = this.fileDependencies.getOrCreate(watchFilePath, new Set());
        affected.add(putPath);
      }
    }

    return Promise.resolve();
  }

  override invalidate(invalidatePath: string): boolean {
    const affected = this.fileDependencies.get(invalidatePath);
    let found = false;

    if (affected) {
      affected.forEach((a) => (found ||= this.loadResults.delete(a)));
      this.fileDependencies.delete(invalidatePath);
    }

    found ||= this.loadResults.delete(invalidatePath);

    return found;
  }

  override get watchFiles(): string[] {
    return [...this.loadResults.keys(), ...this.fileDependencies.keys()];
  }
}