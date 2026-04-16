import fs from "node:fs";

/**
 * 증분 방식으로 파일 mtime을 추적하여 변경 파일을 감지한다.
 *
 * - `detectChanges`: watchTargets 전체를 stat하여 이전 mtime과 비교, 변경 파일 Set 반환
 * - `updateMtimes`: 변경/신규 파일만 stat하여 prevMtimes를 증분 갱신
 */
export class IncrementalMtimeTracker {
  private readonly _prevMtimes = new Map<string, number>();
  private _lastChangedFiles = new Set<string>();

  detectChanges(watchTargets: Iterable<string>): Set<string> {
    const changedFiles = new Set<string>();
    for (const file of watchTargets) {
      try {
        const mtime = fs.statSync(file).mtimeMs;
        const prev = this._prevMtimes.get(file);
        if (prev != null && prev !== mtime) {
          changedFiles.add(file);
        }
      } catch {
        if (this._prevMtimes.has(file)) {
          changedFiles.add(file);
        }
      }
    }
    this._lastChangedFiles = changedFiles;
    return changedFiles;
  }

  updateMtimes(currentWatchTargets: Iterable<string>): void {
    const targetSet =
      currentWatchTargets instanceof Set
        ? (currentWatchTargets as Set<string>)
        : new Set(currentWatchTargets);

    // 1) 삭제된 파일 정리: prevMtimes에 있지만 watchTargets에 없는 파일 제거
    for (const file of this._prevMtimes.keys()) {
      if (!targetSet.has(file)) {
        this._prevMtimes.delete(file);
      }
    }

    // 2) 변경된 파일 mtime 재조회 (watchTargets에 있는 파일만)
    for (const file of this._lastChangedFiles) {
      if (!targetSet.has(file)) continue;
      try {
        this._prevMtimes.set(file, fs.statSync(file).mtimeMs);
      } catch {
        this._prevMtimes.delete(file);
      }
    }

    // 3) 신규 파일만 stat (prevMtimes에 없는 파일)
    for (const file of targetSet) {
      if (!this._prevMtimes.has(file)) {
        try {
          this._prevMtimes.set(file, fs.statSync(file).mtimeMs);
        } catch {
          // 삭제된 파일 — 무시
        }
      }
    }

    this._lastChangedFiles = new Set();
  }
}
