# WBS: sd-cli watch 모드 캐시/감지 버그 수정

## 프로젝트 개요

- **배경:** sd-cli의 watch 모드에서 캐싱 또는 파일 감지 로직의 누락으로 인해, 의존성 변경이나 파일 추가가 정확히 감지되지 않아 빌드 결과가 stale하게 유지되는 버그 존재
- **환경:** simplysm 모노레포, sd-cli 패키지 (`packages/sd-cli`)
- **전제조건:** 없음
- **기술적 제약:** Node.js Worker Thread 기반 빌드 아키텍처, TypeScript incremental build, chokidar 기반 FsWatcher
- **참조 자료:**
  - `packages/sd-cli/src/workers/build-watch-paths.ts` — watch 경로 수집 로직
  - `packages/sd-cli/src/workers/build-change-filter.ts` — 변경 필터링 로직 (shouldSkipRebuild)
  - `packages/sd-cli/src/workers/library-build.worker.ts` — 라이브러리 watch 루프
  - `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — Angular 라이브러리 watch 루프
  - `packages/sd-cli/src/angular/angular-compiler.ts` — AngularCompiler.update() 및 rootNames 사용

## Impact Mapping

- **Goal:** watch 모드에서 모든 유의미한 변경이 정확히 감지되어 수동 재시작 없이 올바른 빌드 결과 제공
  - **Actor:** simplysm 프레임워크를 사용하는 개발자
    - **Impact:** 의존성 타입 변경이나 파일 추가 후 watch 프로세스를 재시작하지 않고 정확한 빌드/타입체크 결과를 받음
      - **Deliverable 1:** replaceDeps watch의 `.d.ts` 감시 추가
      - **Deliverable 2:** ngtsc watch의 파일 추가/삭제 시 rootNames 갱신

## Feature Breakdown

### Epic 1. Watch 모드 감지 버그 수정

#### [x] Feature 1.1 replaceDeps watch에서 `.d.ts` 감시 패턴 추가

**의존성:** 없음

**범위:**

- `build-watch-paths.ts:44-51`의 replaceDeps glob 패턴에 `.d.ts` (`.d.mts`, `.d.cts` 포함) 추가
- library-build.worker.ts의 watch 경로에 반영 확인
- ngtsc-build.worker.ts의 watch 경로에 반영 확인

**경계:**

- server-watch-manager.ts는 metafile 기반 필터링을 사용하므로 이 문제에 해당하지 않음 (수정 불필요)
- `shouldSkipRebuild` 함수 자체의 로직 변경은 이 Feature에서 다루지 않음 (glob 패턴 수정으로 해결)

**근거:**

- 코드 분석: `build-watch-paths.ts:44-51`에서 `*.{js,mjs,cjs}`만 감시하여 `.d.ts` 변경 이벤트가 발생하지 않음
- 코드 분석: `build-change-filter.ts:12-27`의 `shouldSkipRebuild`가 `lastSourceFilePaths`(`.d.ts` 포함)와 비교하므로, `.js` 경로만으로는 매칭 실패 → 리빌드 skip
- 재현 시나리오: replaceDeps 패키지의 공개 타입 변경 → 소비 패키지 watch가 리빌드를 건너뜀

#### [x] Feature 1.2 ngtsc watch에서 파일 추가/삭제 시 rootNames 갱신

**의존성:** 없음

**범위:**

- `ngtsc-build.worker.ts`의 onChange 핸들러에서 `hasFileAddOrRemove`가 true일 때, `getPackageSourceFiles()`를 재호출하여 rootNames를 갱신
- 갱신된 rootNames로 pipeline을 재초기화하거나 update에 반영

**경계:**

- `library-build.worker.ts`는 매 `rebuildAll()`에서 `getPackageSourceFiles()`를 호출하므로 이 문제에 해당하지 않음
- `angular-compiler.ts`의 `AngularCompilerOptions` 인터페이스 변경은 최소화 (rootNames 갱신 방법에 따라 판단)

**근거:**

- 코드 분석: `angular-compiler.ts:247-252`에서 `options.rootNames`는 생성 시 고정되어 `update()` → `initialize()`에서 동일한 배열 재사용
- 코드 비교: `library-build.worker.ts`는 매번 `parseTsconfig()` + `getPackageSourceFiles()`로 재스캔하는 반면, ngtsc worker는 초기 1회만 스캔
- 재현 시나리오: Angular watch 중 새 컴포넌트 추가 → import되지 않은 독립 파일은 컴파일에서 누락

**설계 결정 요약:** (상세: [1.2-ngtsc-watch-rootnames-refresh.md](./1.2-ngtsc-watch-rootnames-refresh.md))

- `updateRootNames()` 메서드를 `AngularCompiler`, `AngularBuildPipeline`에 추가하여 rootNames 갱신 (in-place 변경, pipeline 재생성 대비 안정적)
- `AngularCompilerOptions` 인터페이스 변경 없음 (`rootNames: string[]`이 이미 가변)

## 제외 사항

- ESLint 캐시 문제 (lint-with-program의 타입 의존성 변경 미감지) — 사용자가 ESLint 캐싱 제거로 이미 해결 완료
- `shouldSkipRebuild` 함수의 근본적 리팩토링 (경로 stem 매칭 등) — glob 패턴 수정으로 충분하므로 범위 초과
- server-watch-manager.ts 수정 — metafile 기반 필터링으로 정상 동작하므로 수정 불필요
