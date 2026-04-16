import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { IncrementalMtimeTracker } from "../../src/workers/incremental-mtime-tracker";

describe("IncrementalMtimeTracker", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mtime-unit-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(name: string): string {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, name, "utf-8");
    return filePath;
  }

  it("빈 watchTargets로 detectChanges하면 빈 Set을 반환한다", () => {
    const tracker = new IncrementalMtimeTracker();
    const changed = tracker.detectChanges([]);
    expect(changed.size).toBe(0);
  });

  it("빈 watchTargets로 updateMtimes하면 stat 호출이 없다", () => {
    const tracker = new IncrementalMtimeTracker();
    const spy = vi.spyOn(fs, "statSync");
    tracker.updateMtimes([]);
    expect(spy.mock.calls).toHaveLength(0);
    spy.mockRestore();
  });

  it("모든 파일이 watchTargets에서 제거되면 이후 detectChanges에서 감지되지 않는다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");
    const fileB = createFile("b.ts");

    tracker.updateMtimes([fileA, fileB]);

    // 모든 파일 제거
    tracker.detectChanges([]);
    tracker.updateMtimes([]);

    // 다시 추가 — "신규"로 취급
    const changed = tracker.detectChanges([fileA]);
    expect(changed.has(fileA)).toBe(false);
  });

  it("동일 파일이 watchTargets에 중복되어도 정상 동작한다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");

    tracker.updateMtimes([fileA, fileA]);

    const changed = tracker.detectChanges([fileA]);
    expect(changed.size).toBe(0);
  });

  it("detectChanges 없이 연속 updateMtimes를 호출하면 모두 신규로 처리된다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");

    const spy = vi.spyOn(fs, "statSync");
    tracker.updateMtimes([fileA]);
    expect(spy.mock.calls).toHaveLength(1);
    spy.mockRestore();
  });

  it("존재하지 않는 파일은 detectChanges에서 prevMtimes에 없으면 무시된다", () => {
    const tracker = new IncrementalMtimeTracker();
    const nonExistent = path.join(tmpDir, "ghost.ts");

    const changed = tracker.detectChanges([nonExistent]);
    expect(changed.size).toBe(0);
  });

  it("updateMtimes 중 stat이 실패하는 변경 파일은 prevMtimes에서 제거된다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");

    tracker.updateMtimes([fileA]);

    // 파일 삭제 후 detectChanges — changedFiles에 포함
    fs.unlinkSync(fileA);
    tracker.detectChanges([fileA]);

    // updateMtimes — stat 실패 → prevMtimes에서 제거
    tracker.updateMtimes([fileA]);

    // 파일 재생성
    const fileANew = createFile("a.ts");

    // 다음 detectChanges — "신규"로 취급 (prevMtimes에 없으므로)
    const changed = tracker.detectChanges([fileANew]);
    expect(changed.has(fileANew)).toBe(false);
  });
});
