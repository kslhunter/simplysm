# WBS: legacyModule dev watch 모드 소스 변경 미반영 버그 수정

## 프로젝트 개요

- **배경:** `sd-cli dev` 실행 시 legacyModule 모드에서 Angular TS 소스 변경 후 브라우저가 reload되지만 변경 내용이 반영되지 않는 버그
- **환경:** Vite 8.0.3 + Rolldown 1.0.0-rc.12, Angular 21, TypeScript 5.9
- **전제조건:** 디버그 분석 완료. 근본 원인: `AngularSourceFileCache`가 Rolldown watch 재빌드 시 무효화되지 않음
- **기술적 제약:** modern 모드(Vite dev server)에 영향 없어야 함
- **참조 자료:**
  - `.tasks/260406145411_debug-legacy-watch-cache/debug.md` — 디버그 분석 결과 (ACH 매트릭스, 근본 원인 확정)
  - `packages/sd-cli/src/angular/vite-angular-plugin.ts` — 수정 대상 (sdAngularPlugin)
  - `packages/sd-cli/src/utils/angular-compiler.ts` — AngularCompiler, AngularSourceFileCache

## Impact Mapping

- **Goal:** legacyModule dev 모드에서 TS 소스 변경이 브라우저에 즉시 반영되도록 하여 개발 생산성 정상화
  - **Actor:** legacyModule 프로젝트 개발자
    - **Impact:** 소스 변경 후 수동 서버 재시작 없이 변경 사항 확인
      - **Deliverable:** sdAngularPlugin의 Rolldown watch 재빌드 시 캐시 무효화 + 증분 컴파일

## Feature Breakdown

### Epic 1. 캐시 무효화 버그 수정

#### [x] Feature 1.1 Rolldown watch 재빌드 시 sourceFileCache 선택적 무효화

**의존성:** 없음

**범위:**

- `watchChange` 훅으로 변경된 파일 경로 수집
- `buildStart()` 재빌드 시 수집된 파일만 `sourceFileCache.invalidate()` 호출
- 재빌드 시 기존 compiler를 재사용하여 `update()` 호출 (증분 컴파일)
- 초기 빌드(첫 `buildStart()`)는 기존 로직 유지

**경계:**

- modern 모드(Vite dev server)의 `handleHotUpdate()` 경로는 변경하지 않음
- 프로덕션 빌드 경로는 변경하지 않음
- HMR 지원은 legacy 모드에서 불가 (기존과 동일, live reload 유지)

**근거:**

- 디버그 분석: `sourceFileCache ??=`로 재사용되나 `invalidate()` 미호출 (vite-angular-plugin.ts:197)
- 디버그 분석: `compiler = new AngularCompiler(...)` 매번 새로 생성하여 incremental 상태 유실 (vite-angular-plugin.ts:219)
- Rolldown 타입 정의: `watchChange` 훅 지원 확인

## 제외 사항

- legacy 모드 HMR 지원 — legacyModule은 Chrome 61 호환으로 HMR 불가 (import.meta 미지원)
