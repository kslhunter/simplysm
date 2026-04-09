# WBS: sd-cli client build 결과 정확성 및 타입 안전성 개선

## 프로젝트 개요

- **배경:** 코드 리뷰(`.tasks/260407160817_review-sd-cli-client-dev-build/review.md`)에서 sd-cli의 client dev/build 경로에서 3건의 이슈가 발견되었다. 가장 심각한 이슈는 프로덕션 빌드가 Angular 컴파일 에러를 무시하여 CI/CD가 에러 있는 빌드를 성공으로 판단하는 것이다.
- **환경:** pnpm 모노레포, TypeScript ESM, Angular 21, Vite 8
- **전제조건:** 없음
- **기술적 제약:** 기존 Worker 기반 빌드 아키텍처(client.worker.ts ↔ ViteEngine.ts) 유지
- **참조 자료:**
  - `packages/sd-cli/src/workers/client.worker.ts` — client 빌드 워커 (build/startWatch/startLegacyWatch)
  - `packages/sd-cli/src/engines/ViteEngine.ts` — Vite 기반 클라이언트 엔진
  - `packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts` — dev 모드 오케스트레이터
  - `packages/sd-cli/src/utils/vite-config.ts` — Vite 설정 생성
  - `packages/sd-cli/src/engines/types.ts` — BuildEngine 인터페이스

## Impact Mapping

- **Goal:** sd-cli 프로덕션 빌드의 에러 감지 정확도를 100%로 보장한다
  - **Actor:** 개발자 (CI/CD 파이프라인 사용자)
    - **Impact:** Angular 컴파일 에러가 있는 빌드를 배포하지 않게 된다
      - **Deliverable:** client.worker.ts build() 에러 전파 수정, 타입 안전성 개선

## Feature Breakdown

### Epic 1. client build 신뢰성

#### [x] Feature 1.1 client build 결과 정확성 및 타입 안전성 개선

**의존성:** 없음

**범위:**

- 프로덕션 빌드(`build()`)에서 Angular 컴파일 에러를 결과에 반영
- `DevWatchOrchestrator._getClientPort()` 타입 안전성 확보
- `vite-config.ts` esbuildTarget 타입 단언 수정

**경계:**

- dev 모드(`startWatch`, `startLegacyWatch`)는 이미 에러를 정상 처리하므로 수정 대상이 아님
- BuildEngine 인터페이스에 `readonly port?: number` 추가 (비파괴적 최소 변경, 설계 결정 D1)

**근거:**

- 코드 리뷰 LOGIC-001: `client.worker.ts:build()`가 `onBuild` 콜백에서 `success`/`errors`를 무시하여 항상 `success: true` 반환
- 코드 리뷰 DESIGN-001: `BuildEngine`을 `{ port?: number }`로 duck-typing 캐스팅
- 코드 리뷰 DESIGN-002: `esbuildTarget`이 string일 때 `as string[]` 잘못된 단언

## 제외 사항

- BuildEngine 인터페이스 구조적 변경 (메서드 추가, 생명주기 변경 등) — `readonly port?: number` 추가는 비파괴적이므로 범위 내 포함
- dev 모드 에러 처리 개선 — 이미 정상 동작 중
