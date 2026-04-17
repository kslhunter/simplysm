# WBS: sideEffectScssDeps 미갱신 버그 수정

## 프로젝트 개요

- **배경:** `.tasks/260416210658_review-perf-optimization/` Feature 1.2 구현 리뷰에서 LOGIC-001 버그 발견. `buildWatchEvent`에서 SCSS 변경 없이 새 side-effect import를 추가하면 `sideEffectScssDeps`가 갱신되지 않아, 이후 해당 SCSS의 의존성 변경 시 증분 재컴파일이 누락된다.
- **환경:** pnpm 모노레포, TypeScript ESM, Node.js 20, Angular 21
- **전제조건:** 동작(observable behavior)에 변화가 없어야 함. 기존 성능 최적화를 유지해야 함.
- **기술적 제약:** 없음
- **참조 자료:**
  - `.tasks/260416220233_review-perf-impl-final/review.md` — 리뷰 원문 (LOGIC-001 상세)
  - `.tasks/260416210658_review-perf-optimization/1.2-angular-scss-pipeline-optimization.md` — Feature 1.2 원본 설계
  - `packages/sd-cli/src/workers/library-build.worker.ts` — `buildWatchEvent`, 모듈 스코프 상태
  - `packages/sd-cli/src/angular/ngtsc-build-core.ts` — `writeEmitResults`, `compileSideEffectScss`, `SideEffectScssOptions`

## Impact Mapping

- **Goal:** watch 모드에서 side-effect SCSS 의존성 변경 시 100% 정확한 증분 재컴파일을 보장한다
  - **Actor:** Simplysm 모노레포 개발자
    - **Impact:** 새 side-effect SCSS import 추가 후 의존성 변경 시에도 CSS가 정확히 갱신되어, 수동 리빌드 없이 개발을 계속한다
      - **Deliverable:** `writeEmitResults` 내부 `compileScssFile` 호출 후 `sideEffectScssDeps` 갱신

## Feature Breakdown

### Epic 1. sideEffectScssDeps 동기화

#### [x] Feature 1.1 writeEmitResults에서 sideEffectScssDeps 갱신

**의존성:** 없음

**범위:**

- `writeEmitResults` 내부에서 `compileScssFile` 호출 후 `sideEffectScssDeps`에 의존성을 기록
- `SideEffectScssOptions`에 `sideEffectScssDeps` 필드 추가
- `library-build.worker.ts`에서 `SideEffectScssOptions` 구성 시 `sideEffectScssDeps`를 포함하여 전달

**경계:**

- `compileSideEffectScss`의 기존 `sideEffectScssDeps` 갱신 로직은 변경하지 않음
- `buildWatchEvent`의 `changedScssFiles.size` 분기 로직은 변경하지 않음
- `reverseScssDeps` 재구축 타이밍은 변경하지 않음 (다음 빌드 사이클의 `updateCombinedScssDeps`에서 처리)

**근거:**

- 리뷰 LOGIC-001: `sideEffectScssDeps`는 `compileSideEffectScss` 내부(`ngtsc-build-core.ts:147-149`)에서만 갱신되며, `writeEmitResults` 내부의 `compileScssFile` 호출(`ngtsc-build-core.ts:263`)에서는 갱신되지 않음
- `writeEmitResults`가 이미 `scss.scssDependencies`에 `trackDeps`로 의존성을 기록하는 패턴이 존재(`ngtsc-build-core.ts:266`). `sideEffectScssDeps`도 동일 위치에서 갱신하면 자연스러움

## 제외 사항

- `reverseScssDeps` 미갱신 문제 — 사유: 다음 빌드 사이클에서 `updateCombinedScssDeps` → `rebuildReverseScssDeps()`로 자동 교정됨. 현재 사이클에서 모든 처리가 완료된 후이므로 실질적 영향 없음
