# WBS: sdScopeWatchPlugin SCSS HMR 미동작 수정

## 프로젝트 개요

- **배경:** replaceDeps 패키지의 SCSS 소스 파일 변경 시 Vite HMR이 동작하지 않는 버그
- **환경:** simplysm 모노레포, sd-cli의 Vite dev server, Angular 클라이언트 패키지
- **전제조건:** 디버그 분석 완료 (`.tasks/260409171255_debug-scss-hmr-watch/debug.md`)
- **기술적 제약:** Vite는 기본적으로 `node_modules`를 watcher에서 제외함. `sdScopeWatchPlugin`이 이를 보완하는 역할
- **참조 자료:**
  - `.tasks/260409171255_debug-scss-hmr-watch/debug.md` — 근본 원인 분석 결과
  - `packages/sd-cli/src/utils/vite-scope-watch-plugin.ts` — 수정 대상 파일

## Impact Mapping

- **Goal:** replaceDeps SCSS 파일 변경 시 Vite HMR이 정상 동작하여 개발 생산성 회복
  - **Actor:** simplysm 라이브러리 소비 프로젝트 개발자
    - **Impact:** 라이브러리 SCSS 수정 후 수동 새로고침 없이 즉시 변경 확인
      - **Deliverable:** sdScopeWatchPlugin이 패키지 루트 전체를 감시하도록 수정

## Feature Breakdown

### Epic 1. HMR 감시 범위 수정

#### [x] Feature 1.1 sdScopeWatchPlugin 감시 경로 확장

**의존성:** 없음

**범위:**

- `sdScopeWatchPlugin`의 watch 경로를 `dist/`에서 패키지 루트 전체로 변경
- `node_modules` 등 불필요한 하위 디렉토리 제외 (기존 `EXCLUDED_NAMES` 패턴 참고: `node_modules`, `.cache`, `tests`)
- 인터페이스 `ScopeWatchReplaceDep`의 `sourcePath` JSDoc 업데이트 (더 이상 "dist/ 가 있는 디렉토리"가 아님)

**경계:**

- `watchReplaceDeps` 복사 로직은 변경하지 않음 (이미 정상 동작)
- `handleHotUpdate`의 SCSS 처리 로직은 변경하지 않음 (이미 정상 동작)
- Vite의 `server.watch` 기본 설정은 변경하지 않음

**근거:**

- 디버그 분석: `vite-scope-watch-plugin.ts:47-51`에서 watch 경로가 `dist/`로 하드코딩되어 `scss/` 변경 미감지
- 사용자 선택: 방안 A (패키지 루트 전체 감시)

## 제외 사항

- 없음
