# WBS: replaceDeps 변경 시 Vite 프리번들 캐시 미갱신 문제 해결

## 프로젝트 개요

- **배경:** sd-cli dev 사용 중 replaceDeps의 JS가 변경되어 node_modules에 복제된 이후에도, Vite의 optimizeDeps 프리번들 캐시가 갱신되지 않아 브라우저에서 변경사항이 반영되지 않는 문제
- **환경:** simplysm 모노레포, sd-cli의 Vite 기반 클라이언트 빌드 파이프라인
- **전제조건:** replaceDeps 복제 메커니즘(watchReplaceDeps)은 정상 동작함이 확인됨
- **기술적 제약:** pnpm strict isolation 환경, Angular 21 + Vite 7
- **참조 자료:**
  - `packages/sd-cli/src/utils/vite-config.ts:153-179` — optimizeDeps 설정 (현재 include 방식)
  - `packages/sd-cli/src/utils/vite-scope-watch-plugin.ts` — replaceDeps 변경 감지 플러그인
  - `packages/sd-cli/src/utils/replace-deps.ts` — replaceDeps 복제 메커니즘

## Impact Mapping

- **Goal:** replaceDeps 패키지 변경 시 수동 dev 재시작 없이 브라우저에 자동 반영
  - **Actor:** simplysm 라이브러리를 replaceDeps로 개발하는 소비 프로젝트 개발자
    - **Impact:** 라이브러리 수정 후 dev 재시작 없이 즉시 결과를 확인한다
      - **Deliverable:** replaceDeps 패키지를 optimizeDeps.exclude로 전환하여 프리번들 캐시 문제 제거

## Feature Breakdown

### Epic 1. Vite 프리번들 캐시 문제 해결

#### [x] Feature 1.1 replaceDeps를 optimizeDeps.exclude로 전환

**의존성:** 없음

**범위:**

- `vite-config.ts`에서 replaceDeps 패키지를 `optimizeDeps.include` 대신 `optimizeDeps.exclude`에 등록
- `sdScopeWatchPlugin`에서 변경 감지 시 Vite 모듈 그래프 무효화가 정상 동작하는지 확인

**경계:**

- server 패키지(esbuild) 빌드 파이프라인은 이 Feature에서 다루지 않음
- replaceDeps 복제 메커니즘(watchReplaceDeps) 자체는 수정하지 않음

**근거:**

- 사용자 보고: replaceDeps JS 변경 후 복제되지만 리빌드/새로고침해도 미반영
- 코드 분석: `optimizeDeps.include`로 프리번들된 캐시가 런타임에 갱신되지 않음
- pnpm strict isolation / NG0203 우려 분석: Vite realpath resolve + transform이 프리번들된 @angular/core로 리다이렉트하므로 이중 로딩 발생하지 않음

## 제외 사항

- server 패키지의 esbuild rebuild 문제 — 별도 이슈 (사유: 이 Feature는 client Vite 캐시 문제만 다룸)
