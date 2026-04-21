# replace-deps.ts 분할 -- LLM 검증

## 검증 항목

- 파일 구조: `replace-deps-resolve.ts` 신규 생성, `replace-deps.ts` 기존 유지 확인
- 해석 함수 이동: `resolveReplaceDepEntries`, `parseWorkspaceGlobs`, `collectSearchRoots`, `resolveAllReplaceDepEntries`가 `replace-deps-resolve.ts`에 위치
- 타입 위치: `ReplaceDepEntry`가 `replace-deps-resolve.ts`에서 export, `replace-deps.ts`에서 `export type` re-export
- `WatchReplaceDepResult`가 `replace-deps.ts`에서 export
- `replace-deps.ts`에서 `resolveAllReplaceDepEntries`를 import하여 사용
- `commands/publish.ts` import 경로가 `../utils/replace-deps-resolve`로 변경
- `sd-cli.ts`, `BaseOrchestrator.ts`, `commands/replace-deps.ts`의 import 경로는 변경 없음 (실행 함수만 사용)
- `tests/utils/replace-deps.spec.ts` import 경로가 `../../src/deps/replace-deps-resolve`로 변경
- `tests/utils/replace-deps-watch.spec.ts`, `replace-deps-watch.acc.spec.ts`의 import 경로는 변경 없음
- `replace-deps.ts`에서 `glob` import가 제거됨 (해석 로직 전용)
- `replace-deps-resolve.ts`에서 `fsx`, `FsWatcher`, `exec` import가 없음 (실행 로직 전용)
