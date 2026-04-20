# WBS: replace-deps watch 시작 성능 개선

## 프로젝트 개요

- **배경:** `pnpm dev`/`pnpm watch` 기동 시 `[sd:cli:replace-deps:watch] replace-deps 워치 시작 중...` → `워치 준비 완료` 까지 약 10초 소요. 15개 교체 대상이 있는 환경에서 기동 대기시간이 과도하다.
- **환경:** simplysm 모노레포. `watchReplaceDeps`가 각 entry마다 `FsWatcher.watch()`를 순차 await 호출하여 chokidar 인스턴스를 15개 생성하고 각각 ready 이벤트를 기다림.
- **전제조건:** 없음 (기존 기능 동작 유지).
- **기술적 제약:**
  - `FsWatcher.watch()`는 chokidar `ready` 이벤트를 기다리는 비동기 함수 (`packages/core-node/src/features/fs-watcher.ts:87`)
  - 한 `resolvedSourcePath`가 복수의 target(`actualTargetPath`)에 매핑될 수 있음 — 현재 `sourceEntries` 필터링으로 처리
  - 기존 delay 300ms, `followSymlinks: false`, `isFileContentSame` 스킵 등 동작 유지 필요
- **참조 자료:**
  - `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:195-315` — 수정 대상 `watchReplaceDeps`
  - `packages/sd-cli/src/deps/replace-deps/replace-deps-resolve.ts` — `ReplaceDepEntry` 타입 및 해석기
  - `packages/core-node/src/features/fs-watcher.ts` — `FsWatcher` API (다중 경로 단일 watcher 지원)
  - `packages/sd-cli/tests/utils/replace-deps-watch.spec.ts` / `.acc.spec.ts` — 회귀 검증 기준

## Impact Mapping

- **Goal 1:** `replace-deps` watch 준비 시간을 현재 ~10초에서 수백 ms 수준으로 단축
  - **Actor:** 시뮬리즘 모노레포 개발자
    - **Impact:** `pnpm dev`/`pnpm watch` 기동 대기 부담이 줄어 반복 개발 사이클이 빨라진다
      - **Deliverable:** 단일 `FsWatcher` 기반으로 재구성된 `watchReplaceDeps`

- **Goal 2:** `watchReplaceDeps` 구조의 회귀 방지·런타임 품질 수준 확보
  - **Actor:** 시뮬리즘 모노레포 유지보수 담당자
    - **Impact:** 향후 리팩토링 시 명세된 엣지케이스 회귀를 즉시 감지하고, 런타임 복사 경로가 불필요하게 직렬화되지 않아 변경 반영이 자연스러워진다
      - **Deliverable:** 명세 Gherkin을 코드로 고정한 회귀 테스트 + PERF/DESIGN/CONSIST 개선이 반영된 `watchReplaceDeps`

## Feature Breakdown

### Epic 1. replace-deps watch 구조 개선

#### [x] Feature 1.1 watchReplaceDeps 단일 FsWatcher 통합

**의존성:** 없음

**범위:**

- 모든 entry의 감시 대상 경로(files 필드 + npm 기본 파일)를 수집하여 **단일 `FsWatcher.watch()` 1회 호출**로 감시 시작
- 변경 경로 → 소속 `resolvedSourcePath` 판별 로직 구현 (가장 긴 prefix 매칭 또는 사전 구축한 prefix → entries 맵)
- 판별된 `resolvedSourcePath`에 대응하는 `sourceEntries`에 대해 기존 복사/삭제 로직 수행
- 기존 동작 유지:
  - `onChange({ delay: 300 }, ...)`
  - `followSymlinks: false`
  - 소스 디렉토리/파일 분기 (`stat.isDirectory()` → `fsx.mkdir`, 파일 → copy)
  - 소스 삭제 감지 → `fsx.rm` 호출
  - `isFileContentSame` 매칭 시 복사 스킵
  - `hasActualCopy`가 true일 때만 `options.onChanged` 호출
  - 로그 태그/메시지 형식(`replace-deps 워치 시작 중... (N개 대상)`, `replace-deps 워치 준비 완료`)
  - `loadFilesField` 반환값이 `undefined`인 entry는 경고 후 감시 건너뜀
  - `dispose()`로 단일 watcher 정리
- 기존 테스트(`replace-deps-watch.spec.ts`, `replace-deps-watch.acc.spec.ts`) 통과

**경계:**

- `setupReplaceDeps`(초기 복사) 로직은 수정 범위 아님
- `FsWatcher` 자체 API 변경은 하지 않음 (이미 다중 경로 단일 watcher 지원)
- `replace-deps-resolve.ts` 변경 없음

**근거:**

- 요구사항: "단일 `FsWatcher.watch()`로 통합하고 onChange에서 변경 경로를 entry에 매핑"
- 현재 코드 `replace-deps.ts:210-303` 순차 루프가 병목 — `FsWatcher.watch()`가 chokidar ready 대기(`fs-watcher.ts:87-106`) × 15회
- 한 소스가 복수 target에 매핑되는 케이스는 기존 `sourceEntries` 필터로 처리 중이며, 단일 watcher 구조에서도 사전 맵(`resolvedSourcePath → ReplaceDepEntry[]`)으로 동일 처리 가능

#### [x] Feature 1.2 watchReplaceDeps 리뷰 후속 개선 (테스트 보강 + PERF/DESIGN/CONSIST)

**의존성:** Feature 1.1 (단일 `FsWatcher` 구조 · `sourceMap` · `findSource` · `allWatchPaths`)

**범위:**

- **TEST-001 회귀 테스트 보강** — `packages/sd-cli/tests/utils/replace-deps-watch.spec.ts`에 아래 6건 시나리오 추가:
  1. 동일 `resolvedSourcePath`를 2개 `actualTargetPath`가 참조할 때 양쪽 target에 모두 복사되는지 검증 (Rule "한 source가 복수 target으로 매핑")
  2. 두 entry가 동일 source를 참조할 때 `allWatchPaths`가 중복 제거되어 `FsWatcher.watch`가 중복 경로 없이 호출되는지 검증 (Rule "중복 watchPath 제거")
  3. `package.json`에 `files` 필드가 없으면 `"[name] package.json에 files 필드가 없어 감시 건너뜀"` 경고가 출력되고 해당 source가 감시 대상에서 제외되는지 검증 (Rule "files 필드 없는 source는 제외")
  4. 배칭 구간의 모든 변경이 `isFileContentSame` 매칭으로 스킵될 때 `onChanged`가 호출되지 않는지 검증 (Rule "onChanged 스킵 조건")
  5. 소스 파일이 삭제될 때 `fsx.rm(destPath)`가 수행되고 `onChanged`가 호출되는지 검증 (Rule "소스 삭제")
  6. `dispose()` 호출 시 내부 단일 `watcher.close()`가 호출되어 이후 파일 변경이 감지되지 않는지 검증 (Rule "dispose")

- **PERF-001 onChange 콜백 병렬화** — `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:269-315`의 `for (const { path: changedPath } of changeInfos)` 순차 루프를 변경 경로 단위 `Promise.all`로 전환. 동일 경로(`destPath`) 간 경쟁은 그대로 유지(내부 `sourceEntries` 루프는 순차 유지). `hasActualCopy` 집계는 각 경로 처리의 return 플래그를 `some`으로 병합하여 기존 단일 `onChanged` 호출 의미를 유지.

- **DESIGN-001 빈 감시 대상 경고** — `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:250-253`의 `allWatchPaths.size === 0` 분기에서, `entries.length > 0`인데 모든 source가 제외된 경우 `logger.warn("감시 대상이 없어 워치가 시작되지 않음")`을 출력한다. `entries.length === 0`이면 기존대로 success.

- **DESIGN-002 readdir 지연 실행** — `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:220-223`의 `Promise.all([loadFilesField, readdir])` 병렬 호출을 순차로 전환하여 `loadFilesField` 결과가 `null`이면 `readdir` I/O를 발생시키지 않도록 한다. 성공 경로에서는 기존과 동일하게 `readdir` 실행.

- **CONSIST-001 pathx.posix 중복 호출 제거** — `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:209`의 `const key = pathx.posix(entry.resolvedSourcePath)`를 `const key = entry.resolvedSourcePath`로 단순화. `resolvedSourcePath`는 `replace-deps-resolve.ts:185`에서 이미 `pathx.posixResolve`로 POSIX로 정규화되어 반환된다.

- 변경 후 회귀 테스트(`replace-deps-watch.spec.ts` 전체 및 `.acc.spec.ts` 삭제 여부 무관) 통과 + 신규 6건 테스트 통과

**경계:**

- `FsWatcher` API 변경 없음
- `setupReplaceDeps` · `replace-deps-resolve.ts` 변경 없음
- `WatchReplaceDepResult.dispose` 시그니처(`() => void`) 유지 — async 반환 타입 변경은 범위 밖
- `fsx.copy`의 pnpm hard link 미차단은 선행 이슈이자 본 리팩토링 이전부터 존재 — 별도 과제로 분리 (본 Feature 범위 밖)
- nested source longest-prefix 동작 변경은 Feature 1.1에서 이미 의도된 동작으로 확정됨 — CHANGELOG 기재 여부는 배포 단계 결정

**근거:**

- 리뷰 문서: `.tasks/260417202850_replace-deps-watch-perf/review.md`
  - TEST-001(Medium) — 명세 Gherkin의 6개 Scenario 미커버
  - PERF-001(Low) — 단일 watcher 통합 후 배치 내부 직렬화
  - DESIGN-001(Low) — 빈 watchPath일 때 사용자 혼동
  - DESIGN-002(Low) — readdir I/O 낭비
  - CONSIST-001(Low) — 중복 posix 변환
- 사용자 선택: B안(Medium + Low 전부)
- 기존 구현: `.tasks/260417202850_replace-deps-watch-perf/1.1-unify-fs-watcher.md` (구조 이해 필수)
- 명세 출처: 동일 디렉토리 `1.1-unify-fs-watcher.md`의 Gherkin Rule들

### 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
|---------|----------|-----------|
| 1.1     | 없음      | -         |
| 1.2     | 1.1      | 단일 `FsWatcher` 구조(`sourceMap`, `findSource`, `allWatchPaths`) |

- 순환 없음. 1단계 Feature(1.1)는 완료 상태(`[x]`).

## 제외 사항

- `setupReplaceDeps`(초기 복사) 병렬화/최적화 — 사용자 요청 범위 밖, 별도 이슈
- `FsWatcher` API 확장 — 현재 API로 충분
- 성능 수치 목표 수치화(ms 단위 SLO 정의) — 이번 개선은 구조적 병목 제거가 목적이며 측정은 결과 확인용
- `fsx.copy`의 pnpm hard link 미차단(watch 시 글로벌 store 영향 가능성) — 리팩토링 이전부터 존재한 선행 이슈. 사유: 본 과제 범위 밖
- `WatchReplaceDepResult.dispose` async 반환 타입 변경 — 사유: 사용자 요청 B안 범위 밖, 기존 시그니처 유지

## 수행 순서

```
1단계 (완료)
  - Feature 1.1: watchReplaceDeps 단일 FsWatcher 통합

2단계
  - Feature 1.2: watchReplaceDeps 리뷰 후속 개선 (← 1.1)
```

## 다음 단계

```
/sd-dev .tasks/260417202850_replace-deps-watch-perf/wbs.md 1.2
```
