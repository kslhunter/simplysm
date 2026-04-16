import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { IncrementalMtimeTracker } from "../../src/workers/incremental-mtime-tracker";

describe("IncrementalMtimeTracker — Acceptance", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mtime-acc-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(name: string): string {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, `content-${name}`, "utf-8");
    return filePath;
  }

  function touchFile(filePath: string): void {
    const stat = fs.statSync(filePath);
    const newTime = stat.mtimeMs / 1000 + 2;
    fs.utimesSync(filePath, newTime, newTime);
  }

  // Scenario: 변경된 파일만 mtime 갱신
  it("onEnd에서 변경된 파일만 stat 호출한다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");
    const fileB = createFile("b.ts");
    const fileC = createFile("c.ts");
    const targets = [fileA, fileB, fileC];

    // 초기 빌드: prevMtimes 채우기
    tracker.updateMtimes(targets);

    // 파일 A 변경
    touchFile(fileA);

    // onStart: 변경 감지
    const changed = tracker.detectChanges(targets);
    expect(changed.size).toBe(1);
    expect(changed.has(fileA)).toBe(true);

    // onEnd: 증분 갱신 — 변경된 A만 stat
    const spy = vi.spyOn(fs, "statSync");
    tracker.updateMtimes(targets);
    const statPaths = spy.mock.calls.map((c) => c[0]);
    expect(statPaths).toContain(fileA);
    expect(statPaths).not.toContain(fileB);
    expect(statPaths).not.toContain(fileC);
    spy.mockRestore();
  });

  // Scenario: 새로 추가된 파일만 stat 호출
  it("onEnd에서 새로 추가된 파일만 stat 호출한다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");
    const fileB = createFile("b.ts");

    tracker.updateMtimes([fileA, fileB]);

    const fileC = createFile("c.ts");
    tracker.detectChanges([fileA, fileB, fileC]);

    const spy = vi.spyOn(fs, "statSync");
    tracker.updateMtimes([fileA, fileB, fileC]);
    const statPaths = spy.mock.calls.map((c) => c[0]);
    expect(statPaths).toEqual([fileC]);
    spy.mockRestore();
  });

  // Scenario: 변경도 신규도 없으면 stat 호출 0회
  it("변경도 신규도 없으면 onEnd에서 stat 호출이 0회이다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");
    const fileB = createFile("b.ts");

    tracker.updateMtimes([fileA, fileB]);
    tracker.detectChanges([fileA, fileB]);

    const spy = vi.spyOn(fs, "statSync");
    tracker.updateMtimes([fileA, fileB]);
    expect(spy.mock.calls).toHaveLength(0);
    spy.mockRestore();
  });

  // Scenario: 삭제된 파일이 prevMtimes에서 제거된다
  it("삭제된 파일은 이후 빌드에서 변경으로 감지되지 않는다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");
    const fileB = createFile("b.ts");

    tracker.updateMtimes([fileA, fileB]);

    // fileB를 watchTargets에서 제거
    tracker.detectChanges([fileA]);
    tracker.updateMtimes([fileA]);

    // fileB를 다시 추가 — "신규" 파일이므로 changedFiles에 포함되지 않음
    const changed = tracker.detectChanges([fileA, fileB]);
    expect(changed.has(fileB)).toBe(false);
  });

  // Scenario: mtime 변경된 파일이 changedFiles에 포함된다
  it("mtime이 변경된 파일이 changedFiles에 포함된다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");

    tracker.updateMtimes([fileA]);
    touchFile(fileA);

    const changed = tracker.detectChanges([fileA]);
    expect(changed.has(fileA)).toBe(true);
  });

  // Scenario: 삭제된 파일이 changedFiles에 포함된다
  it("삭제된 파일이 changedFiles에 포함된다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");

    tracker.updateMtimes([fileA]);
    fs.unlinkSync(fileA);

    const changed = tracker.detectChanges([fileA]);
    expect(changed.has(fileA)).toBe(true);
  });

  // Scenario: 신규 파일은 changedFiles에 포함되지 않는다
  it("신규 파일은 changedFiles에 포함되지 않는다", () => {
    const tracker = new IncrementalMtimeTracker();
    const fileA = createFile("a.ts");

    tracker.updateMtimes([fileA]);

    const fileB = createFile("b.ts");
    const changed = tracker.detectChanges([fileA, fileB]);
    expect(changed.has(fileB)).toBe(false);
  });
});
