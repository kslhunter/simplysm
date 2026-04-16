import { describe, it, expect, vi } from "vitest";
import path from "path";
import type { OnLoadResult } from "esbuild";

const { MemoryLoadResultCache, createCachedLoad } = await import(
  "../../src/esbuild/load-result-cache.js"
);

describe("MemoryLoadResultCache", () => {
  it("put 후 get으로 동일한 결과를 반환한다", () => {
    const cache = new MemoryLoadResultCache();
    const result: OnLoadResult = { contents: "x", loader: "js" };

    cache.put("key1", result);
    expect(cache.get("key1")).toBe(result);
  });

  it("존재하지 않는 키에 대해 undefined를 반환한다", () => {
    const cache = new MemoryLoadResultCache();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("watchFiles가 있는 결과를 put하면 fileDependencies가 추적된다", () => {
    const cache = new MemoryLoadResultCache();
    const depPath = "/workspace/dep.js";
    cache.put("file:app.js", {
      contents: "x",
      loader: "js",
      watchFiles: [depPath],
    });

    expect(cache.watchFiles).toContain(path.normalize(depPath));
  });

  it("invalidate는 의존 파일에 연결된 캐시 항목을 제거한다", () => {
    const cache = new MemoryLoadResultCache();
    const depPath = "/workspace/dep.js";
    cache.put("file:app.js", {
      contents: "x",
      loader: "js",
      watchFiles: [depPath],
    });

    const found = cache.invalidate(path.normalize(depPath));
    expect(found).toBe(true);
    expect(cache.get("file:app.js")).toBeUndefined();
  });

  it("invalidate는 의존성이 없는 파일에 대해 false를 반환한다", () => {
    const cache = new MemoryLoadResultCache();
    expect(cache.invalidate("/unknown.js")).toBe(false);
  });

  it("여러 항목이 같은 watchFile을 공유하면 모두 무효화된다", () => {
    const cache = new MemoryLoadResultCache();
    const sharedPath = "/workspace/shared.js";
    const normalizedShared = path.normalize(sharedPath);
    cache.put("file:a.js", { contents: "a", watchFiles: [sharedPath] });
    cache.put("file:b.js", { contents: "b", watchFiles: [sharedPath] });

    // invalidate는 normalize된 경로로 호출해야 한다 (호출자 책임, 원본 패턴)
    cache.invalidate(normalizedShared);
    expect(cache.get("file:a.js")).toBeUndefined();
    expect(cache.get("file:b.js")).toBeUndefined();
  });

  it("watchFiles는 경로를 정규화하여 추적한다", () => {
    const cache = new MemoryLoadResultCache();
    cache.put("file:app.js", {
      contents: "x",
      watchFiles: ["/workspace\\dep.js"],
    });

    // path.normalize 적용 결과에 따라 경로가 정규화됨
    const watchFiles = cache.watchFiles;
    expect(watchFiles.length).toBe(1);
  });
});

describe("createCachedLoad", () => {
  it("cache가 undefined이면 원본 콜백을 그대로 반환한다", () => {
    const callback = vi.fn();
    const result = createCachedLoad(undefined, callback);
    expect(result).toBe(callback);
  });

  it("캐시 미스 시 콜백을 호출하고 결과를 캐싱한다", async () => {
    const cache = new MemoryLoadResultCache();
    const callback = vi.fn(() => ({
      contents: "result",
      loader: "js" as const,
    }));

    const cached = createCachedLoad(cache, callback) as (
      args: { namespace: string; path: string },
    ) => Promise<OnLoadResult | null | undefined>;

    await cached({ namespace: "file", path: "/app.js" });
    expect(callback).toHaveBeenCalledTimes(1);

    // 캐시에 저장됨
    expect(cache.get("file:/app.js")).toBeDefined();
  });

  it("콜백이 null을 반환하면 캐싱하지 않는다", async () => {
    const cache = new MemoryLoadResultCache();
    const callback = vi.fn(() => null);

    const cached = createCachedLoad(cache, callback) as (
      args: { namespace: string; path: string },
    ) => Promise<OnLoadResult | null | undefined>;

    const result = await cached({ namespace: "file", path: "/skip.js" });
    expect(result).toBeNull();
    expect(cache.get("file:/skip.js")).toBeUndefined();
  });

  it("file namespace일 때 watchFiles에 args.path가 자동 추가된다", async () => {
    const cache = new MemoryLoadResultCache();
    const callback = vi.fn(() => ({
      contents: "result",
      loader: "js" as const,
    }));

    const cached = createCachedLoad(cache, callback) as (
      args: { namespace: string; path: string },
    ) => Promise<OnLoadResult | null | undefined>;

    await cached({ namespace: "file", path: "/app.js" });
    const stored = cache.get("file:/app.js");
    expect(stored?.watchFiles).toContain("/app.js");
  });
});
