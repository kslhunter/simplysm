# WBS: replaceDeps 라이브러리 .js 변경 시 Angular HMR 정상화

## 프로젝트 개요

- **배경:** `sd-cli dev`에서 `replaceDeps`로 교체된 라이브러리의 `.js` 파일(스타일 등) 변경 시, Angular HMR `/@ng/component` 응답이 비어있어 브라우저에 변경이 반영되지 않음 (GitHub issue kslhunter/simplysm#20)
- **환경:** `@simplysm/sd-cli@14.0.18`, Angular 21, Vite 7.3.1+, pnpm 모노레포
- **전제조건:** 디버그 분석 완료 — 근본 원인: `vite-angular-plugin.ts`의 `hotUpdate` 훅이 `.js` 확장자를 거부하여 Angular 재컴파일 미실행
- **기술적 제약:** `compiler.update()`는 `.ts` 소스 파일 변경을 전제로 설계됨. `.js` 의존성 변경 시 의존 `.ts` 파일을 역추적하여 재컴파일 트리거 필요
- **참조 자료:**
  - `.tasks/260406211558_debug-js-hmr-empty/debug.md` — 근본 원인 분석 및 방안 B 선택 결과
  - `packages/sd-cli/src/angular/vite-angular-plugin.ts` — Angular Vite 플러그인 (hotUpdate 훅)
  - `packages/sd-cli/src/utils/angular-compiler.ts` — AngularCompiler (증분 컴파일)
  - `packages/sd-cli/src/utils/vite-scope-watch-plugin.ts` — replaceDeps dist/ 감시 플러그인

## Impact Mapping

- **Goal:** replaceDeps 라이브러리 스타일 변경이 페이지 새로고침 없이 브라우저에 반영됨
  - **Actor:** sd-cli dev 사용자 (라이브러리 + 클라이언트 동시 개발자)
    - **Impact:** 라이브러리 스타일 수정 후 수동 새로고침 대신 즉시 확인하여 개발 속도 유지
      - **Deliverable:** hotUpdate에서 replaceDeps .js 변경 시 의존 컴포넌트를 찾아 Angular HMR 수행

## Feature Breakdown

### Epic 1. Angular HMR replaceDeps 지원

#### [x] Feature 1.1 replaceDeps .js 변경 시 Angular HMR 정상 동작

**의존성:** 없음

**범위:**

- `sdScopeWatchPlugin`에서 watch path의 symlink를 realpath로 해결하여 Vite 모듈 그래프와 경로 일치 → 모듈 무효화 정상화
- `sdAngularPlugin`에 replaceDeps dist 경로 목록을 전달
- `hotUpdate` 훅에서 replaceDeps `.js` 파일 변경 감지 시 `server.hot.send({ type: 'full-reload' })` + `return []`로 전체 새로고침 강제
- Angular Linker(`JavaScriptTransformer`)가 처리한 라이브러리 `.js` 출력에서 컴포넌트 메타데이터(styles, template)를 파싱하여 `templateUpdates`를 수동 생성 → `/@ng/component`에서 정상 응답 → 진정한 HMR

**경계:**

- `AngularCompiler.update()` 내부 로직은 변경하지 않음
- 라이브러리 `.js` 파싱은 Angular Linker 출력 포맷에 의존 (Angular 버전 업그레이드 시 호환성 검증 필요)

**근거:**

- debug.md: 근본 원인 #1 symlink 경로 불일치 (replace-deps.ts:219-223 vs vite-scope-watch-plugin.ts:47-52)
- debug.md: 근본 원인 #2 hotUpdate 확장자 필터 (vite-angular-plugin.ts:304-310)
- 사용자 요구: "무조건 돼야함" → full-reload 기반 + 진정한 HMR 모두 구현
- GitHub issue kslhunter/simplysm#20

## 제외 사항

- 없음
