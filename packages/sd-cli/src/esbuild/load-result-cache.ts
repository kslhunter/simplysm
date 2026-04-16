import path from "path";
import type { OnLoadResult, PluginBuild } from "esbuild";

export interface LoadResultCache {
  get(path: string): OnLoadResult | undefined;
  put(path: string, result: OnLoadResult): void | Promise<void>;
  invalidate(path: string): boolean;
  readonly watchFiles: readonly string[];
}

export function createCachedLoad(
  cache: LoadResultCache | undefined,
  callback: Parameters<PluginBuild["onLoad"]>[1],
): Parameters<PluginBuild["onLoad"]>[1] {
  if (cache == null) {
    return callback;
  }

  return async (args) => {
    const loadCacheKey = `${args.namespace}:${args.path}`;
    let result: OnLoadResult | null | undefined = cache.get(loadCacheKey);

    if (result == null) {
      result = (await callback(args)) ?? null;

      // null/undefined는 캐싱하지 않는다
      if (result != null) {
        // file namespace일 때 watchFiles에 요청 경로를 자동 추가
        if (args.namespace === "file") {
          result.watchFiles ??= [];
          result.watchFiles.push(args.path);
        }

        await cache.put(loadCacheKey, result);
      }
    }

    return result;
  };
}

export class MemoryLoadResultCache implements LoadResultCache {
  private readonly _loadResults = new Map<string, OnLoadResult>();
  private readonly _fileDependencies = new Map<string, Set<string>>();

  get(key: string): OnLoadResult | undefined {
    return this._loadResults.get(key);
  }

  put(key: string, result: OnLoadResult): void {
    this._loadResults.set(key, result);

    if (result.watchFiles != null) {
      for (const watchFile of result.watchFiles) {
        const normalizedWatchFile = path.normalize(watchFile);
        let affected = this._fileDependencies.get(normalizedWatchFile);
        if (affected == null) {
          affected = new Set();
          this._fileDependencies.set(normalizedWatchFile, affected);
        }
        affected.add(key);
      }
    }
  }

  invalidate(filePath: string): boolean {
    const affectedKeys = this._fileDependencies.get(filePath);
    let found = false;

    if (affectedKeys != null) {
      for (const affected of affectedKeys) {
        if (this._loadResults.delete(affected)) {
          found = true;
        }
      }
      this._fileDependencies.delete(filePath);
    }

    return found;
  }

  get watchFiles(): string[] {
    return [...this._fileDependencies.keys()];
  }
}
