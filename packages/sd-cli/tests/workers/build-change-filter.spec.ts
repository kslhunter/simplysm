import { describe, it, expect, vi } from "vitest";
import { consola } from "consola";
import { hasFileAddOrRemove, shouldSkipRebuild } from "../../src/workers/build-change-filter";

describe("hasFileAddOrRemove", () => {
  it("returns false when only change events", () => {
    expect(hasFileAddOrRemove([{ event: "change", path: "a.ts" }])).toBe(false);
  });

  it("returns true when add event exists", () => {
    expect(hasFileAddOrRemove([{ event: "add", path: "a.ts" }])).toBe(true);
  });

  it("returns true when unlink event exists", () => {
    expect(hasFileAddOrRemove([{ event: "unlink", path: "a.ts" }])).toBe(true);
  });

  it("returns false for empty changes", () => {
    expect(hasFileAddOrRemove([])).toBe(false);
  });
});

describe("shouldSkipRebuild", () => {
  const logger = consola.withTag("test");

  it("logs debug message when skipping rebuild", () => {
    const debugSpy = vi.spyOn(logger, "debug");
    shouldSkipRebuild(["x.ts"], false, new Set(["a.ts", "b.ts"]), logger);
    expect(debugSpy).toHaveBeenCalledWith(
      "변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀",
    );
  });

  it("accepts Iterable<string> (Set) as filePaths", () => {
    const filePaths = new Set(["c.ts"]);
    const result = shouldSkipRebuild(filePaths, false, new Set(["a.ts"]), logger);
    expect(result).toBe(true);
  });
});
