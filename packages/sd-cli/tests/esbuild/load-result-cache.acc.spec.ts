import { describe, it, expect, vi } from "vitest";
import path from "path";
import type { OnLoadResult } from "esbuild";

const { MemoryLoadResultCache, createCachedLoad } = await import(
  "../../src/esbuild/load-result-cache.js"
);

describe("MemoryLoadResultCache — Acceptance", () => {
  it("put → get 조회 후, invalidate로 캐시 제거", () => {
    const cache = new MemoryLoadResultCache();
    const depPath = "/workspace/dep.js";
    const utilPath = "/workspace/util.js";
    const result: OnLoadResult = {
      contents: "console.log('hello');",
      loader: "js",
      watchFiles: [depPath, utilPath],
    };

    // put 후 get으로 조회
    cache.put("file:/workspace/app.js", result);
    expect(cache.get("file:/workspace/app.js")).toBe(result);

    // watchFiles에 의존 파일이 포함됨 (normalize된 경로)
    expect(cache.watchFiles).toContain(path.normalize(depPath));
    expect(cache.watchFiles).toContain(path.normalize(utilPath));

    // 의존 파일 변경 → invalidate (normalize된 경로로 호출) → 캐시 제거
    const found = cache.invalidate(path.normalize(depPath));
    expect(found).toBe(true);
    expect(cache.get("file:/workspace/app.js")).toBeUndefined();
  });

  it("createCachedLoad로 래핑된 콜백은 캐시 히트 시 원본을 호출하지 않는다", async () => {
    const cache = new MemoryLoadResultCache();
    const callback = vi.fn(() => ({
      contents: "transformed",
      loader: "js" as const,
    }));

    const cached = createCachedLoad(cache, callback) as (
      args: { namespace: string; path: string },
    ) => Promise<OnLoadResult | null | undefined>;

    // 첫 호출 — 원본 실행
    const result1 = await cached({ namespace: "file", path: "/workspace/vendor.js" });
    expect(result1?.contents).toBe("transformed");
    expect(callback).toHaveBeenCalledTimes(1);

    // 재호출 — 캐시 히트
    const result2 = await cached({ namespace: "file", path: "/workspace/vendor.js" });
    expect(result2?.contents).toBe("transformed");
    expect(callback).toHaveBeenCalledTimes(1); // 추가 호출 없음
  });
});
