# 코드 리뷰: replace-deps-watch-perf 최종 심층 리뷰

**대상:** `packages/sd-cli/src/deps/replace-deps/replace-deps.ts` (`watchReplaceDeps`, L195-325)
**테스트:** `packages/sd-cli/tests/utils/replace-deps-watch.spec.ts`
**요구명세:** `.tasks/260417202850_replace-deps-watch-perf/1.1-unify-fs-watcher.md`

## 요약

전체적으로 WBS와 명세를 잘 따라 구현되었고, 기존 동작(이전 커밋의 `watchReplaceDeps`)도 대부분 보존됨.
확인 결과:

- 단일 `FsWatcher.watch()` 1회 호출 → OK (L265)
- `Set<string>` 기반 중복 watchPath 제거 → OK (L216)
- longest-prefix 매칭 → OK (L256-263)
- `Map<resolvedSourcePath, entries[]>` 사전 그룹화 → OK (L207-213)
- `onChange({ delay: 300 })`, `followSymlinks: false`, 로그 메시지 형식 → OK (L265-269, L204, L251, L317)
- `source → 복수 target` 처리 (`sourceMap.get(src)!` 순회) → OK (L275-277)
- `isFileContentSame` 스킵, `hasActualCopy`일 때만 `onChanged` → OK (L295, L312)
- 단일 watcher dispose → OK (L321-323)
- 경로 정규화 (`pathx.posix`) 일관성: `sourceMap` 키/`sortedSources`가 POSIX, `FsWatcher.onChange` 콜백 `changeInfo.path`도 `PosixPath`(`fs-watcher.ts:322`)이므로 `startsWith` 비교 정상

이하 발견된 이슈.

---

## TEST-001 [Medium] 명세 Scenario 다수가 회귀 테스트에서 미커버

- **위치:** `packages/sd-cli/tests/utils/replace-deps-watch.spec.ts`

구현계획 `1.1-unify-fs-watcher.md`의 Gherkin에는 아래 시나리오가 명시되어 있지만, 현재 테스트 파일의 5개 케이스(복수 파일 배칭, files에 없는 파일, README.md, nested longest-prefix, options undefined)는 이들 대부분을 검증하지 않는다.

미커버 시나리오:

1. **다중 target 복사** (Rule "한 source가 복수 target으로 매핑"): 한 `resolvedSourcePath` → 2개 `actualTargetPath`일 때 양쪽 모두 복사되는지 검증 없음. `sourceMap.get(src)!` 순회가 복수 entry를 처리하는지는 구현에서만 확인됨.
2. **중복 watchPath 제거** (Rule "단일 FsWatcher"): 두 entry가 동일 `resolvedSourcePath`를 참조할 때 `allWatchPaths`가 중복을 걸러내는지 검증 없음.
3. **files 필드 누락 경고** (Rule "files 필드 없는 source는 제외"): `package.json.files`가 없으면 경고 출력 + 감시 제외라는 동작 검증 없음.
4. **onChanged 스킵** (Rule "기존 엣지케이스"): `isFileContentSame`으로 스킵된 배치에서 `onChanged`가 호출되지 않는지 검증 없음. (현재 "1번 호출" 테스트만 존재)
5. **소스 삭제 → target 삭제** (Rule "엣지케이스"): `unlink` 이벤트 시 `fsx.rm(destPath)` 동작 검증 없음.
6. **dispose → watcher.close()**: 명시적 검증 없음.

**개선 방향:** spec에 위 6가지 케이스를 추가한다. 특히 (1) 다중 target과 (3) files 누락은 실패 시 프로덕션 영향이 크므로 우선순위가 높다. (4) onChanged 스킵은 기존 단일 watcher 구조에서 `hasActualCopy` 플래그가 올바르게 리셋되는지 보장하므로 필수.

---

## PERF-001 [Low] onChange 콜백 내부 처리가 완전 직렬화

- **위치:** `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:269-315`

```ts
watcher.onChange({ delay: 300 }, async (changeInfos) => {
  let hasActualCopy = false;
  for (const { path: changedPath } of changeInfos) {     // L272 순차
    ...
    for (const e of sourceEntries) {                     // L277 순차
      ...
      try { await fs.promises.access(changedPath); ... } // L283 순차
      const stat = await fs.promises.stat(changedPath);   // L291 순차
      if (await isFileContentSame(...)) continue;         // L295 순차
      await fsx.copy(changedPath, destPath);              // L297 순차
    }
  }
});
```

독립적인 서로 다른 `changedPath`끼리 순차로 처리되어, 50개 변경 × 평균 100ms = 5초 대기. 이전 구현(entry별 독립 watcher)에서는 각 watcher의 콜백이 Promise로 독립 실행되어 자연스럽게 병렬이었다. 단일 watcher로 통합하면서 배치 내부는 **단일 비동기 루프**가 되어 오히려 처리가 직렬화되었다.

**개선 방향:** 같은 destination 파일에 대한 경쟁은 피해야 하므로 `destPath` 기준으로 그룹화한 뒤 그룹 간 `Promise.all` 실행:

```ts
await Promise.all(
  changeInfos.map(async ({ path: changedPath }) => {
    const src = findSource(changedPath);
    if (src == null) return false;
    const sourceEntries = sourceMap.get(src)!;
    let localCopy = false;
    for (const e of sourceEntries) {
      // ... 기존 로직, localCopy |= true
    }
    return localCopy;
  }),
).then((flags) => flags.some((f) => f) && options?.onChanged?.());
```

단, 실용적으로는 기동 시 수백 ms 개선이 목적이었고 런타임 복사 빈도는 낮으므로 급하지 않음. Low.

---

## DESIGN-001 [Low] allWatchPaths.size === 0일 때 success 로그 출력

- **위치:** `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:250-253`

```ts
if (allWatchPaths.size === 0) {
  logger.success("replace-deps 워치 준비 완료");
  return { entries, dispose: () => {} };
}
```

`entries.length > 0`인데 모든 source가 files 필드 누락/에러로 `sourceMap.delete`된 경우도 이 경로로 떨어진다. 감시는 사실상 시작되지 않았는데 "준비 완료"라는 성공 로그가 찍혀 사용자 혼동을 준다.

**개선 방향:** `entries.length > 0 && allWatchPaths.size === 0`일 때는 `logger.warn("감시 대상이 없어 워치가 시작되지 않음")` 정도로 표기. 또는 성공 로그를 유지하되 경고 메시지를 덧붙인다.

---

## DESIGN-002 [Low] loadFilesField 실패 경로에서 readdir 결과 폐기

- **위치:** `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:220-231`

```ts
const [files, rootEntries] = await Promise.all([
  loadFilesField(sourcePath),
  fs.promises.readdir(sourcePath).catch(() => [] as string[]),
]);

if (files == null) {
  logger.warn(...);
  sourceMap.delete(sourcePath);
  return;  // rootEntries 결과가 폐기됨
}
```

`files`가 `null`인 경로에서 `readdir` I/O가 낭비된다. 15개 source 중 일부만 files 필드가 없으면 사소한 비효율. 단, 병렬 덕분에 총 실행 시간에는 영향 적음.

**개선 방향:** `files`를 먼저 await → `null`이면 early return → 이후 `readdir` 호출. 또는 현재처럼 유지 (성능 영향 미미).

---

## CONSIST-001 [Low] pathx.posix 중복 호출

- **위치:** `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:209`

```ts
const key = pathx.posix(entry.resolvedSourcePath);
```

`entry.resolvedSourcePath`는 `replace-deps-resolve.ts:185`에서 `pathx.posixResolve(projectRoot, sourcePath)`로 생성되므로 이미 POSIX. 여기서 `pathx.posix`를 다시 호출하는 것은 no-op (`replace()`는 해당 없는 패턴이면 동일 문자열 반환).

**개선 방향:** `const key = entry.resolvedSourcePath;`로 단순화하거나, `ReplaceDepEntry.resolvedSourcePath` 타입을 `PosixPath`로 선언하여 타입 시스템 수준에서 중복 변환을 차단한다 (후자는 범위 밖).

---

## OBSERVE-001 [참고] nested source의 동작 변경

- **위치:** `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:258-263`

기존 구현은 entry별 독립 watcher였으므로, outer source가 inner source의 하위 경로도 감시 범위에 포함하면(예: `files: ["**"]`) outer target에도 inner 파일이 복사됐을 것. 현재 `findSource`는 longest-prefix **하나만** 반환하므로 inner로만 매핑됨 → outer target에는 복사되지 않음.

명세 Scenario "nested source longest-prefix"에서 의도된 동작으로 명시되어 있고 테스트(`replace-deps-watch.spec.ts:134-184`)가 이를 검증하므로 **회귀가 아님**. 다만 배포 시 CHANGELOG에 명시하면 안전하다.

---

## 거짓양성으로 제외한 항목

- **`fsx.copy`가 pnpm hard link를 끊지 않음** (`core-node/src/utils/fs.ts:215` `fs.promises.copyFile` 직접 호출): 기존 `watchReplaceDeps`도 동일하게 `fsx.copy` 사용(직전 커밋 확인). 이번 리팩토링 범위 밖의 선행 이슈이며, 필요 시 별도 이슈로 다룬다.
- **`sourceMap.delete(sourcePath)` during iteration** (L229, L245): `[...sourceMap]`로 스냅샷 배열을 만든 뒤 `Promise.all`로 순회하므로 안전하다.
- **`dispose` fire-and-forget** (L321-323): `WatchReplaceDepResult.dispose: () => void` 시그니처는 WBS "기존 export 시그니처 유지"에 따른 제약이다.
- **`sourceMap.get(src)!`의 non-null assertion** (L275): `findSource`가 `sortedSources`(= `sourceMap.keys()`)에서 반환한 키이므로 항상 존재. 안전.
- **`changedPath === src` 조건** (L260): 실질적으로 발생하지 않는 케이스지만 방어 목적이며 비용도 미미.

---

## 심각도 요약

| Severity | 건수 | 카테고리 |
|----------|------|---------|
| Critical | 0    | -       |
| Medium   | 1    | TEST-001 |
| Low      | 4    | PERF-001, DESIGN-001, DESIGN-002, CONSIST-001 |
| 참고      | 1    | OBSERVE-001 |

**총평:** 리팩토링 목표(ready 대기 1회로 축소, 동작 보존)는 성공적으로 달성됐다. 즉시 수정이 필요한 Critical은 없고, **Medium 1건(테스트 보강)만 권장**한다. Low 항목은 필요에 따라 후속 개선.
