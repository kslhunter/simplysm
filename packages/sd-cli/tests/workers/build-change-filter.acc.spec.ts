import { describe, it, expect, vi, beforeEach } from "vitest";
import { consola } from "consola";
import { hasFileAddOrRemove, shouldSkipRebuild } from "../../src/workers/build-change-filter";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("hasFileAddOrRemove + shouldSkipRebuild integration", () => {
  const logger = consola.withTag("test");

  // Scenario: 관련 없는 파일 변경은 리빌드를 건너뛴다
  it("skips rebuild when changed files are not in source file paths", () => {
    const changes = [{ event: "change", path: "c.ts" }];
    const lastSourceFilePaths = new Set(["a.ts", "b.ts"]);

    const addOrRemove = hasFileAddOrRemove(changes);
    const skip = shouldSkipRebuild(
      changes.map((c) => c.path),
      addOrRemove,
      lastSourceFilePaths,
      logger,
    );

    expect(addOrRemove).toBe(false);
    expect(skip).toBe(true);
  });

  // Scenario: 관련 있는 파일 변경은 리빌드를 수행한다
  it("does not skip rebuild when changed files are in source file paths", () => {
    const changes = [{ event: "change", path: "a.ts" }];
    const lastSourceFilePaths = new Set(["a.ts", "b.ts"]);

    const addOrRemove = hasFileAddOrRemove(changes);
    const skip = shouldSkipRebuild(
      changes.map((c) => c.path),
      addOrRemove,
      lastSourceFilePaths,
      logger,
    );

    expect(addOrRemove).toBe(false);
    expect(skip).toBe(false);
  });

  // Scenario: 파일 추가/삭제가 있으면 항상 리빌드를 수행한다
  it("does not skip rebuild when files are added", () => {
    const changes = [{ event: "add", path: "d.ts" }];
    const lastSourceFilePaths = new Set(["a.ts", "b.ts"]);

    const addOrRemove = hasFileAddOrRemove(changes);
    const skip = shouldSkipRebuild(
      changes.map((c) => c.path),
      addOrRemove,
      lastSourceFilePaths,
      logger,
    );

    expect(addOrRemove).toBe(true);
    expect(skip).toBe(false);
  });

  // Scenario: lastSourceFilePaths가 없으면 항상 리빌드를 수행한다
  it("does not skip rebuild when lastSourceFilePaths is undefined", () => {
    const changes = [{ event: "change", path: "c.ts" }];

    const addOrRemove = hasFileAddOrRemove(changes);
    const skip = shouldSkipRebuild(
      changes.map((c) => c.path),
      addOrRemove,
      undefined,
      logger,
    );

    expect(addOrRemove).toBe(false);
    expect(skip).toBe(false);
  });
});
