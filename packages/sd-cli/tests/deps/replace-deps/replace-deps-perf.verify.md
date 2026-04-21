# replace-deps 성능 최적화 — LLM 검증

## 검증 항목

### Slice 1: Set 중복 검사 + glob 병렬화

- `resolveAllReplaceDepEntries`에서 `entries.some()` 대신 `Set<string>` 사용 확인: `replace-deps-resolve.ts:143`에 `seenTargetPaths = new Set<string>()` 선언, `:205`에서 `seenTargetPaths.has(actualTargetPath)` + `seenTargetPaths.add(actualTargetPath)` 사용. 기존 `entries.some()` 제거됨.
- glob 병렬화 확인: `replace-deps-resolve.ts:167-171`에서 `Promise.all(Object.keys(replaceDeps).map(...))` 사용. 기존 순차 `for` 루프 제거됨. `:172-174`에서 `flatMap`으로 결과를 합침.
- `seenTargetPaths`가 while 루프 바깥에 선언되어 재귀 탐색 전체에 걸쳐 중복 방지가 유지됨 확인.

### Slice 2: watch onChange entries 사전 필터링

- `watchReplaceDeps`에서 사전 필터링 확인: `replace-deps.ts:240-242`에 `sourceEntries = entries.filter(e => e.resolvedSourcePath === entry.resolvedSourcePath)` 선언. watcher 생성 전에 필터링되어 클로저에 캡처됨.
- onChange 내부에서 `sourceEntries`만 순회 확인: `replace-deps.ts:252`에서 `for (const e of sourceEntries)` 사용. 기존 `for (const e of entries)` + `if (e.resolvedSourcePath !== entry.resolvedSourcePath) continue;` 패턴이 제거됨.
- `entries` 배열은 `resolveAllReplaceDepEntries` 호출 후 불변이므로, 필터링 결과가 watcher 생명주기 동안 유효함 확인 (`replace-deps.ts:202`에서 `entries` 할당 후 수정 없음).
